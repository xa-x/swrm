import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Fly.io configuration
const FLY_API_HOST = "https://api.machines.dev/v1";
const FLY_APP_NAME = process.env.FLY_APP_NAME || "swrm-agents";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN || "";

// ZeroClaw image
const ZEROCLAW_IMAGE = "ghcr.io/zeroclaw-labs/zeroclaw:latest";

// Region mapping
const REGIONS: Record<string, string> = {
  auto: "iad",      // US East (default)
  "us-east": "iad",
  "us-west": "sea",
  "eu-west": "fra",
  "ap-southeast": "sin",
};

interface FlyMachineResponse {
  id: string;
  name: string;
  state: string;
  region: string;
  config: {
    env: Record<string, string>;
    image: string;
  };
}

// ============ ACTIONS (HTTP calls to Fly.io) ============

// Create container on Fly.io
export const createContainer = action({
  args: {
    agentId: v.id("agents"),
    provider: v.string(),
    apiKey: v.string(),
    model: v.optional(v.string()),
    personality: v.string(),
    skills: v.array(v.string()),
    region: v.string(),
  },
  handler: async (ctx, args): Promise<{ machineId: string; port: number }> => {
    const region = REGIONS[args.region] || "iad";
    const machineName = `swrm-${args.agentId.slice(0, 8)}`;

    // Build ZeroClaw config
    const personalityPrompt = getPersonalityPrompt(args.personality);
    const configToml = `
api_key = "${args.apiKey}"
default_provider = "${args.provider}"
${args.model ? `default_model = "${args.model}"` : ''}

[memory]
backend = "sqlite"
auto_save = true

[autonomy]
level = "supervised"
workspace_only = true

[gateway]
port = 42617
host = "0.0.0.0"

# Skills: ${args.skills.join(', ')}
# Personality: ${personalityPrompt}
    `.trim();

    // Create machine via Fly.io API
    const response = await fetch(`${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FLY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: machineName,
        region,
        config: {
          image: ZEROCLAW_IMAGE,
          env: {
            ZEROCLAW_API_KEY: args.apiKey,
            ZEROCLAW_PROVIDER: args.provider,
            ZEROCLAW_MODEL: args.model || "default",
            ZEROCLAW_CONFIG: configToml,
          },
          guest: {
            cpu_kind: "shared",
            cpus: 1,
            memory_mb: 512,
          },
          services: [
            {
              ports: [
                { port: 42617, handlers: ["http"] },
              ],
            },
          ],
          metadata: {
            agent_id: args.agentId,
            managed_by: "swrm",
          },
          auto_destroy: false,
          restart: {
            policy: "on-failure",
            max_retries: 3,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Fly.io error:", error);
      throw new Error(`Failed to create machine: ${error}`);
    }

    const machine: FlyMachineResponse = await response.json();

    // Update agent with machine ID
    await ctx.runMutation(internal.agents.updateStatus, {
      agentId: args.agentId,
      status: "running",
      flyMachineId: machine.id,
    });

    // Log action
    await ctx.runMutation(internal.actions.log, {
      agentId: args.agentId,
      action: "container_created",
      details: { 
        machineId: machine.id, 
        region,
        port: 42617,
      },
    });

    return { machineId: machine.id, port: 42617 };
  },
});

// Start machine
export const startMachine = action({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start machine: ${error}`);
    }

    return { success: true };
  },
});

// Stop machine
export const stopMachine = action({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to stop machine: ${error}`);
    }

    return { success: true };
  },
});

// Restart machine
export const restartMachine = action({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    // Stop then start
    await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${FLY_API_TOKEN}` },
      }
    );

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/start`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${FLY_API_TOKEN}` },
      }
    );

    return { success: true };
  },
});

// Get machine status
export const getMachineStatus = action({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}`,
      {
        headers: {
          "Authorization": `Bearer ${FLY_API_TOKEN}`,
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

// Get machine logs
export const getMachineLogs = action({
  args: { 
    machineId: v.string(),
    tail: v.optional(v.number()),
  },
  handler: async (ctx, { machineId, tail = 100 }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}/logs?tail=${tail}`,
      {
        headers: {
          "Authorization": `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get logs");
    }

    const logs = await response.text();
    return { logs };
  },
});

// Destroy machine
export const destroyMachine = action({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const response = await fetch(
      `${FLY_API_HOST}/apps/${FLY_APP_NAME}/machines/${machineId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${FLY_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to destroy machine: ${error}`);
    }

    return { success: true };
  },
});

// ============ HELPERS ============

function getPersonalityPrompt(personality: string): string {
  const prompts: Record<string, string> = {
    professional: "You are a professional assistant. Be thorough, accurate, and formal.",
    friendly: "You are a friendly assistant. Be warm, approachable, and conversational.",
    concise: "You are a direct assistant. Be brief, to the point, no fluff.",
    creative: "You are a creative assistant. Think outside the box, offer unique perspectives.",
  };

  return prompts[personality] || prompts.professional;
}
