"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { decryptApiKey } from "./encryption";

const FLY_API = "https://api.machines.dev";
const APP_NAME = "swrm";

async function flyFetch(path: string, options: RequestInit = {}) {
  const token = process.env.FLY_API_TOKEN;
  if (!token) throw new Error("FLY_API_TOKEN not set");

  const response = await fetch(`${FLY_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fly API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const createMachine = internalAction({
  args: {
    agentId: v.id("agents"),
    apiKey: v.string(),
    provider: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const decryptedKey = args.apiKey.length > 50 
      ? decryptApiKey(args.apiKey) 
      : args.apiKey;

    const machine = await flyFetch(`/v1/apps/${APP_NAME}/machines`, {
      method: "POST",
      body: JSON.stringify({
        config: {
          image: "ghcr.io/zeroclaw-labs/zeroclaw:latest",
          env: {
            API_KEY: decryptedKey,
            PROVIDER: args.provider,
            ZEROCLAW_MODEL: args.model || "gpt-4o-mini",
            ZEROCLAW_SYSTEM_PROMPT_BASE64: Buffer.from(args.systemPrompt).toString("base64"),
            ZEROCLAW_GATEWAY_PORT: "42617",
            ZEROCLAW_ALLOW_PUBLIC_BIND: "true",
          },
          guest: {
            cpu_kind: "shared",
            cpus: 1,
            memory_mb: 256,
          },
          restart: { 
            policy: "on-failure", 
            max_retries: 3 
          },
          metadata: {
            agentId: args.agentId,
          },
          services: [{
            protocol: "tcp",
            internal_port: 42617,
            ports: [
              { port: 443, handlers: ["tls", "http"] },
              { port: 80, handlers: ["http"] }
            ],
          }],
          checks: {
            health: {
              type: "http",
              port: 42617,
              path: "/health",
              interval: "15s",
              timeout: "10s",
            },
          },
        },
      }),
    });

    // Wait for machine to be started
    await flyFetch(
      `/v1/apps/${APP_NAME}/machines/${machine.id}/wait?state=started&timeout=30`
    );

    // Update agent with machine info
    await ctx.runMutation(internal.agents.updateStatus, {
      agentId: args.agentId,
      status: "running",
      containerId: machine.id,
      containerUrl: `http://${machine.private_ip}:42617`,
    });

    return {
      machineId: machine.id,
      state: machine.state,
      privateIp: machine.private_ip,
      region: machine.region,
    };
  },
});

export const listMachines = internalAction({
  args: {
    agentId: v.optional(v.string()),
  },
  handler: async (ctx, { agentId }) => {
    const query = agentId ? `?metadata.agentId=${agentId}` : "";
    return await flyFetch(`/v1/apps/${APP_NAME}/machines${query}`);
  },
});

export const getMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}`);
  },
});

export const startMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const result = await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}/start`, {
      method: "POST",
    });

    // Wait for started state
    await flyFetch(
      `/v1/apps/${APP_NAME}/machines/${machineId}/wait?state=started&timeout=30`
    );

    return result;
  },
});

export const stopMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    const result = await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}/stop`, {
      method: "POST",
    });

    // Wait for stopped state
    await flyFetch(
      `/v1/apps/${APP_NAME}/machines/${machineId}/wait?state=stopped&timeout=30`
    );

    return result;
  },
});

export const deleteMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(
      `/v1/apps/${APP_NAME}/machines/${machineId}?force=true`,
      { method: "DELETE" }
    );
  },
});

export const callAgent = internalAction({
  args: {
    machineId: v.string(),
    message: v.string(),
    pairingToken: v.optional(v.string()),
  },
  handler: async (ctx, { machineId, message, pairingToken }) => {
    // Get machine to find its private IP
    const machine = await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}`);
    
    if (machine.state !== "started") {
      throw new Error("Machine not running");
    }

    const url = `http://${machine.private_ip}:42617/webhook`;
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (pairingToken) {
      headers["Authorization"] = `Bearer ${pairingToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Agent error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      content: data.response || data.message || "",
      tokens: Math.ceil((data.response || "").length / 4),
    };
  },
});
