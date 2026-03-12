/**
 * Docker Engine Container Management (Development)
 * 
 * Uses Docker socket for local container orchestration.
 * SECURITY: Only runs server-side via internalAction.
 * 
 * SHARED VOLUME: All containers mount `swrm-shared` at /workspace
 * for agent file sharing (code, data, artifacts).
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Docker configuration
const DOCKER_HOST = process.env.DOCKER_HOST || "http://localhost";
const DOCKER_PORT = process.env.DOCKER_PORT || "2375";
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

// ZeroClaw image
const ZEROCLAW_IMAGE = "ghcr.io/zeroclaw-labs/zeroclaw:latest";

// Shared volume for agent workspace
const SHARED_VOLUME = "swrm-shared";

// Gateway port inside container
const GATEWAY_PORT = 42617;

interface DockerContainerResponse {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Ports: Array<{
    PrivatePort: number;
    PublicPort: number;
    Type: string;
  }>;
}

/**
 * Call Docker API via HTTP
 */
async function dockerApi(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: object
): Promise<any> {
  const url = `${DOCKER_HOST}:${DOCKER_PORT}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Docker API error: ${error}`);
  }

  return response.json();
}

/**
 * Ensure shared volume exists
 */
async function ensureSharedVolume(): Promise<void> {
  try {
    const volumes = await dockerApi("/volumes");
    const exists = volumes.Volumes?.some((v: any) => v.Name === SHARED_VOLUME);
    
    if (!exists) {
      await dockerApi("/volumes/create", "POST", {
        Name: SHARED_VOLUME,
        Labels: {
          "ai.swrm.managed": "true",
          "ai.swrm.purpose": "agent-workspace",
        },
      });
      console.log(`✅ Created shared volume: ${SHARED_VOLUME}`);
    }
  } catch (error) {
    console.error("Failed to ensure shared volume:", error);
    // Continue anyway - volume mount will fail if truly missing
  }
}

/**
 * Create a container for an agent
 */
export const createContainer = internalAction({
  args: {
    agentId: v.id("agents"),
    userId: v.string(),
    name: v.string(),
    provider: v.string(),
    apiKey: v.string(),
    model: v.optional(v.string()),
    personality: v.string(),
    customPersonality: v.optional(v.string()),
    skills: v.array(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ containerId: string; port: number }> => {
    const {
      agentId,
      userId,
      name,
      provider,
      apiKey,
      model,
      personality,
      customPersonality,
      skills,
    } = args;

    // Ensure shared volume exists
    await ensureSharedVolume();

    // Container name (Docker requires lowercase, alphanumeric, hyphens)
    const containerName = `swrm-agent-${agentId.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

    // Build personality prompt
    const personalityPrompt = getPersonalityPrompt(personality, customPersonality);

    // Build environment variables
    const env: string[] = [
      `ZEROCLAW_API_KEY=${apiKey}`,
      `ZEROCLAW_PROVIDER=${provider}`,
      `ZEROCLAW_MODEL=${model || "default"}`,
      `AGENT_ID=${agentId}`,
      `AGENT_NAME=${name}`,
      `AGENT_PERSONALITY=${personalityPrompt}`,
      `AGENT_SKILLS=${skills.join(",")}`,
      `ZEROCLAW_GATEWAY_PORT=${GATEWAY_PORT}`,
      `ZEROCLAW_GATEWAY_HOST=0.0.0.0`,
      `ZEROCLAW_MEMORY_BACKEND=sqlite`,
      `ZEROCLAW_MEMORY_AUTO_SAVE=true`,
      `ZEROCLAW_AUTONOMY_LEVEL=supervised`,
      `ZEROCLAW_WORKSPACE_ONLY=true`,
    ];

    if (customPersonality) {
      env.push(`AGENT_CUSTOM_PERSONALITY=${customPersonality}`);
    }

    try {
      // Pull image first (if not present)
      // Note: In production, pre-pull this image
      
      // Create container
      const response = await dockerApi("/containers/create", "POST", {
        name: containerName,
        Image: ZEROCLAW_IMAGE,
        Env: env,
        ExposedPorts: {
          [`${GATEWAY_PORT}/tcp`]: {},
        },
        HostConfig: {
          PortBindings: {
            [`${GATEWAY_PORT}/tcp`]: [{ HostPort: "0" }], // Random port assignment
          },
          Binds: [
            `${SHARED_VOLUME}:/workspace:rw`, // Shared workspace
          ],
          RestartPolicy: {
            Name: "on-failure",
            MaximumRetryCount: 3,
          },
          Resources: {
            Memory: 512 * 1024 * 1024, // 512MB
            NanoCpus: 1e9, // 1 CPU
          },
        },
        Labels: {
          "ai.swrm.managed": "true",
          "ai.swrm.agentId": agentId,
          "ai.swrm.userId": userId,
        },
      });

      const containerId = response.Id;

      // Start container
      await dockerApi(`/containers/${containerId}/start`, "POST");

      // Get assigned port
      const inspect = await dockerApi(`/containers/${containerId}/json`);
      const port = inspect.NetworkSettings?.Ports?.[`${GATEWAY_PORT}/tcp`]?.[0]?.HostPort || GATEWAY_PORT;

      // Update agent status
      await ctx.runMutation(internal.agents.updateStatus, {
        agentId,
        status: "running",
        containerId,
      });

      // Log action
      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_created",
        details: {
          containerId,
          containerName,
          port,
          volume: SHARED_VOLUME,
        },
      });

      console.log(`✅ Docker container created: ${containerId} for agent ${agentId}`);

      return { containerId, port: parseInt(port) };
    } catch (error: any) {
      console.error("Failed to create container:", error);

      // Update agent status to error
      await ctx.runMutation(internal.agents.updateStatus, {
        agentId,
        status: "error",
      });

      // Log error
      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_error",
        details: { error: error.message },
      });

      throw error;
    }
  },
});

/**
 * Start a stopped container
 */
export const startContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    try {
      await dockerApi(`/containers/${containerId}/start`, "POST");

      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_started",
        details: { containerId },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to start container: ${error.message}`);
    }
  },
});

/**
 * Stop a running container
 */
export const stopContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    try {
      await dockerApi(`/containers/${containerId}/stop`, "POST");

      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_stopped",
        details: { containerId },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to stop container: ${error.message}`);
    }
  },
});

/**
 * Remove a container
 */
export const removeContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    try {
      // Stop first if running
      await dockerApi(`/containers/${containerId}/stop?t=5`, "POST").catch(() => {});
      
      // Remove container
      await dockerApi(`/containers/${containerId}?force=true`, "DELETE");

      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_removed",
        details: { containerId },
      });

      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to remove container: ${error.message}`);
    }
  },
});

/**
 * Get container status
 */
export const getContainerStatus = internalAction({
  args: {
    containerId: v.string(),
  },
  handler: async (ctx, { containerId }) => {
    try {
      const inspect = await dockerApi(`/containers/${containerId}/json`);

      return {
        status: inspect.State.Status,
        running: inspect.State.Running,
        port: inspect.NetworkSettings?.Ports?.[`${GATEWAY_PORT}/tcp`]?.[0]?.HostPort,
      };
    } catch (error: any) {
      throw new Error(`Failed to get container status: ${error.message}`);
    }
  },
});

/**
 * Call agent via HTTP
 * Routes to container's gateway port
 */
export const callAgent = internalAction({
  args: {
    containerId: v.string(),
    message: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, message, agentId }) => {
    // Get container's port mapping
    const inspect = await dockerApi(`/containers/${containerId}/json`);
    const port = inspect.NetworkSettings?.Ports?.[`${GATEWAY_PORT}/tcp`]?.[0]?.HostPort;

    if (!port) {
      throw new Error("Container port not mapped");
    }

    const agentUrl = `http://localhost:${port}/agent`;

    try {
      const response = await fetch(agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.statusText}`);
      }

      const data = await response.json();
      const outputTokens = Math.ceil((data.response || data.message || "").length / 4);

      return {
        content: data.response || data.message || "",
        outputTokens,
      };
    } catch (error: any) {
      if (error.message?.includes("ECONNREFUSED") || error.message?.includes("timeout")) {
        throw new Error("Agent is not responding. It may be stopped or starting.");
      }
      throw error;
    }
  },
});

/**
 * Helper: Get personality prompt
 */
function getPersonalityPrompt(personality: string, custom?: string): string {
  if (custom) return custom;

  const prompts: Record<string, string> = {
    professional:
      "You are a professional assistant. Be thorough, accurate, and formal.",
    friendly:
      "You are a friendly assistant. Be warm, approachable, and conversational.",
    concise: "You are a direct assistant. Be brief, to the point, no fluff.",
    creative:
      "You are a creative assistant. Think outside the box, offer unique perspectives.",
  };

  return prompts[personality] || prompts.professional;
}
