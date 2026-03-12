import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

// Fly.io configuration
const FLY_API_HOST = "https://api.machines.dev/v1";
const FLY_APP_NAME = process.env.FLY_APP_NAME || "swrm-agents";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN || "";

// ZeroClaw Docker image
const ZEROCLAW_IMAGE = "ghcr.io/zeroclaw-labs/zeroclaw:latest";

// Region mapping
const REGIONS: Record<string, string> = {
  auto: "iad", // US East (default)
  "us-east": "iad",
  "us-west": "sea",
  "eu-west": "fra",
  "ap-southeast": "sin",
};

interface FlyMachineConfig {
  name: string;
  region: string;
  config: {
    image: string;
    env: Record<string, string>;
    metadata: Record<string, string>;
    guest: {
      cpu_kind: string;
      cpus: number;
      memory_mb: number;
    };
    services: Array<{
      ports: Array<{ port: number; handlers: string[] }>;
    }>;
    auto_destroy: boolean;
    restart: {
      policy: string;
      max_retries: number;
    };
  };
}

interface FlyMachineResponse {
  id: string;
  name: string;
  state: string;
  region: string;
  config: {
    env: Record<string, string>;
    image: string;
  };
  ips: Array<{
    kind: string;
    ip: string;
  }>;
}

/**
 * Create a Fly.io Machine with ZeroClaw
 * Called from agents.create mutation
 */
export const createContainer = action({
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
  handler: async (ctx, args): Promise<{ machineId: string; internalUrl: string }> => {
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
      region = "auto",
    } = args;

    // Map region
    const flyRegion = REGIONS[region] || "iad";

    // Generate machine name (Fly.io requires lowercase, alphanumeric, hyphens)
    const machineName = `swrm-${agentId.replace(/[^a-z0-9-]/g, '')}`.slice(0, 63);

    // Build personality prompt
    const personalityPrompt = getPersonalityPrompt(personality, customPersonality);

    // Build environment variables for ZeroClaw
    const env: Record<string, string> = {
      // ZeroClaw core config
      ZEROCLAW_API_KEY: apiKey,
      ZEROCLAW_PROVIDER: provider,
      ZEROCLAW_MODEL: model || "default",
      
      // Agent metadata
      AGENT_ID: agentId,
      AGENT_NAME: name,
      AGENT_PERSONALITY: personalityPrompt,
      AGENT_SKILLS: skills.join(","),
      
      // Gateway config
      ZEROCLAW_GATEWAY_PORT: "42617",
      ZEROCLAW_GATEWAY_HOST: "0.0.0.0",
      
      // Memory backend
      ZEROCLAW_MEMORY_BACKEND: "sqlite",
      ZEROCLAW_MEMORY_AUTO_SAVE: "true",
      
      // Autonomy level
      ZEROCLAW_AUTONOMY_LEVEL: "supervised",
      ZEROCLAW_WORKSPACE_ONLY: "true",
    };

    // Add custom personality if provided
    if (customPersonality) {
      env.AGENT_CUSTOM_PERSONALITY = customPersonality;
    }

    // Build machine config
    const machineConfig: FlyMachineConfig = {
      name: machineName,
      region: flyRegion,
      config: {
        image: ZEROCLAW_IMAGE,
        env,
        metadata: {
          agent_id: agentId,
          user_id: userId,
          managed_by: "swrm",
          created_at: new Date().toISOString(),
        },
        guest: {
          cpu_kind: "shared",
          cpus: 1,
          memory_mb: 512,
        },
        services: [
          {
            ports: [{ port: 42617, handlers: ["http"] }],
          },
        ],
        auto_destroy: false,
        restart: {
          policy: "on-failure",
          max_retries: 3,
        },
      },
    };

    try {
      // Create machine via Fly.io API
      const response = await fetch(
        `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FLY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(machineConfig),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fly.io API error:", errorText);
        throw new Error(`Failed to create Fly.io Machine: ${errorText}`);
      }

      const machine: FlyMachineResponse = await response.json();

      // Internal URL for inter-service communication
      // Fly.io Machines can communicate via internal DNS
      const internalUrl = `http://${machine.id}.vm.${FLY_APP_NAME}.internal:42617`;

      // Update agent with machine ID
      await ctx.runMutation(internal.agents.updateStatus, {
        agentId,
        status: "running",
        flyMachineId: machine.id,
      });

      // Log action
      await ctx.runMutation(internal.actions.log, {
        agentId,
        action: "container_created",
        details: {
          machineId: machine.id,
          machineName: machine.name,
          region: flyRegion,
          internalUrl,
        },
      });

      console.log(`✅ Fly.io Machine created: ${machine.id} for agent ${agentId}`);

      return {
        machineId: machine.id,
        internalUrl,
      };
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
        details: {
          error: error.message,
        },
      });

      throw error;
    }
  },
});

/**
 * Start a stopped machine
 */
export const startMachine = action({
  args: {
    machineId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { machineId, agentId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start machine: ${error}`);
    }

    // Log action
    await ctx.runMutation(internal.actions.log, {
      agentId,
      action: "machine_started",
      details: { machineId },
    });

    return { success: true };
  },
});

/**
 * Stop a running machine
 */
export const stopMachine = action({
  args: {
    machineId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { machineId, agentId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to stop machine: ${error}`);
    }

    // Log action
    await ctx.runMutation(internal.actions.log, {
      agentId,
      action: "machine_stopped",
      details: { machineId },
    });

    return { success: true };
  },
});

/**
 * Restart a machine
 */
export const restartMachine = action({
  args: {
    machineId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { machineId, agentId }) => {
    // Stop first
    await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start again
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to restart machine: ${error}`);
    }

    // Log action
    await ctx.runMutation(internal.actions.log, {
      agentId,
      action: "machine_restarted",
      details: { machineId },
    });

    return { success: true };
  },
});

/**
 * Destroy a machine
 */
export const destroyMachine = action({
  args: {
    machineId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { machineId, agentId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to destroy machine: ${error}`);
    }

    // Log action
    await ctx.runMutation(internal.actions.log, {
      agentId,
      action: "machine_destroyed",
      details: { machineId },
    });

    return { success: true };
  },
});

/**
 * Get machine status
 */
export const getMachineStatus = action({
  args: {
    machineId: v.string(),
  },
  handler: async (ctx, { machineId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}`,
      {
        headers: {
          Authorization: `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get machine status");
    }

    const machine: FlyMachineResponse = await response.json();

    return {
      status: machine.state,
      region: machine.region,
      image: machine.config.image,
    };
  },
});

/**
 * Call ZeroClaw agent via internal Fly.io network
 */
export const callAgent = action({
  args: {
    machineId: v.string(),
    message: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { machineId, message, agentId }) => {
    // Internal Fly.io URL
    const agentUrl = `http://${machineId}.vm.${FLY_APP_NAME}.internal:42617/agent`;

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
