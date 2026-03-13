"use node";

/**
 * Docker Engine Container Management (Development / Fallback)
 * 
 * Uses Docker CLI (child_process) for local container orchestration.
 * SECURITY: Only runs server-side via internalAction.
 * 
 * SHARED VOLUME: All containers mount `swrm-shared` at /workspace
 * for agent file sharing (code, data, artifacts).
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ZeroClaw image
const ZEROCLAW_IMAGE = "ghcr.io/zeroclaw-labs/zeroclaw:latest";

// Shared volume for agent workspace
const SHARED_VOLUME = "swrm-shared";

// Gateway port inside container
const GATEWAY_PORT = 42617;

/**
 * Ensure shared volume exists
 */
async function ensureSharedVolume(): Promise<void> {
  try {
    const { stdout } = await execAsync(`docker volume ls -q -f name=^${SHARED_VOLUME}$`);
    if (!stdout.trim()) {
      await execAsync(`docker volume create --name ${SHARED_VOLUME} --label ai.swrm.managed=true --label ai.swrm.purpose=agent-workspace`);
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
    pairingCode: v.string(),
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
      pairingCode,
    } = args;

    // Ensure shared volume exists
    await ensureSharedVolume();

    // Container name (Docker requires lowercase, alphanumeric, hyphens)
    const containerName = `swrm-agent-${agentId.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

    // Build personality prompt
    const personalityPrompt = getPersonalityPrompt(personality, customPersonality);

    // Build environment variables array
    const envArgs: string[] = [
      `-e ZEROCLAW_API_KEY="${apiKey}"`,
      `-e ZEROCLAW_PROVIDER="${provider}"`,
      `-e ZEROCLAW_MODEL="${model || "default"}"`,
      `-e AGENT_ID="${agentId}"`,
      `-e AGENT_NAME="${name}"`,
      `-e AGENT_PERSONALITY="${personalityPrompt.replace(/"/g, '\\"')}"`,
      `-e AGENT_SKILLS="${skills.join(",")}"`,
      `-e ZEROCLAW_GATEWAY_PORT="${GATEWAY_PORT}"`,
      `-e ZEROCLAW_GATEWAY_HOST="0.0.0.0"`,
      `-e ZEROCLAW_MEMORY_BACKEND="sqlite"`,
      `-e ZEROCLAW_MEMORY_AUTO_SAVE="true"`,
      `-e ZEROCLAW_AUTONOMY_LEVEL="supervised"`,
      `-e ZEROCLAW_WORKSPACE_ONLY="true"`,
      `-e ZEROCLAW_PAIRING_CODE="${pairingCode}"`,
    ];

    if (customPersonality) {
      envArgs.push(`-e AGENT_CUSTOM_PERSONALITY="${customPersonality.replace(/"/g, '\\"')}"`);
    }

    try {
      // Create container using docker CLI
      const cmd = `docker run -d \\
        --name ${containerName} \\
        ${envArgs.join(" ")} \\
        -p ${GATEWAY_PORT} \\
        -v ${SHARED_VOLUME}:/workspace:rw \\
        --restart on-failure:3 \\
        --memory 512m \\
        --cpus 1 \\
        --label ai.swrm.managed=true \\
        --label ai.swrm.agentId=${agentId} \\
        --label ai.swrm.userId=${userId} \\
        ${ZEROCLAW_IMAGE}`;

      const { stdout } = await execAsync(cmd);
      const containerId = stdout.trim();

      // Get assigned port
      const portCmd = `docker port ${containerId} ${GATEWAY_PORT}/tcp`;
      const { stdout: portOutput } = await execAsync(portCmd);

      // Output format is usually "0.0.0.0:12345" or similar
      const portMatch = portOutput.match(/:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1]) : GATEWAY_PORT;

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

      return { containerId, port };
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
      await execAsync(`docker start ${containerId}`);

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
      await execAsync(`docker stop ${containerId}`);

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
      // Remove container force
      await execAsync(`docker rm -f ${containerId}`);

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
      const { stdout: inspectOut } = await execAsync(`docker inspect --format='{{json .State}}' ${containerId}`);
      const state = JSON.parse(inspectOut.trim());

      let port = null;
      try {
        if (state.Running) {
          const { stdout: portOut } = await execAsync(`docker port ${containerId} ${GATEWAY_PORT}/tcp`);
          const portMatch = portOut.match(/:(\d+)/);
          port = portMatch ? portMatch[1] : null;
        }
      } catch (e) {
        // Ignored, port missing or stopped
      }

      return {
        status: state.Status,
        running: state.Running,
        port,
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
    pairingToken: v.optional(v.string()),
  },
  handler: async (ctx, { containerId, message, agentId, pairingToken }) => {
    let port;
    try {
      const { stdout: portOut } = await execAsync(`docker port ${containerId} ${GATEWAY_PORT}/tcp`);
      const portMatch = portOut.match(/:(\d+)/);
      port = portMatch ? portMatch[1] : null;
    } catch (e) {
      throw new Error("Container port not mapped");
    }

    if (!port) {
      throw new Error("Container port not mapped");
    }

    const agentUrl = `http://localhost:${port}/agent`;

    try {
      const response = await fetch(agentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pairingToken ? { "Authorization": `Bearer ${pairingToken}` } : {}),
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
      if (error.message?.includes("ECONNREFUSED") || error.message?.includes("timeout") || error.message?.includes("fetch")) {
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
