"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { exec } from "child_process";
import { promisify } from "util";
import { decryptApiKey } from "./encryption";

const execAsync = promisify(exec);

const ZEROCLAW_IMAGE = "ghcr.io/zeroclaw-labs/zeroclaw:latest";
const GATEWAY_PORT = 42617;

/**
 * Spawn ZeroClaw container with auto-pairing
 */
export const createContainer = internalAction({
  args: {
    agentId: v.id("agents"),
    userId: v.string(),
    name: v.string(),
    provider: v.string(),
    apiKey: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const { agentId, userId, name, provider, apiKey, model, systemPrompt } = args;

    const decryptedKey = apiKey.length > 50 ? decryptApiKey(apiKey) : apiKey;
    const containerName = `swrm-${agentId.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

    const env = [
      `API_KEY=${decryptedKey}`,
      `PROVIDER=${provider}`,
      model ? `ZEROCLAW_MODEL=${model}` : "",
      `ZEROCLAW_GATEWAY_PORT=${GATEWAY_PORT}`,
      `ZEROCLAW_ALLOW_PUBLIC_BIND=true`,
      `ZEROCLAW_SYSTEM_PROMPT_BASE64=${Buffer.from(systemPrompt).toString("base64")}`,
    ].filter(Boolean);

    try {
      const { stdout } = await execAsync(
        `docker run -d --name ${containerName} ` +
        `${env.map(e => `-e "${e}"`).join(" ")} ` +
        `-p ${GATEWAY_PORT} ` +
        `--memory 512m --cpus 1 ` +
        `--label ai.swrm.agentId=${agentId} ` +
        `${ZEROCLAW_IMAGE} gateway`
      );

      const containerId = stdout.trim();

      const { stdout: portOut } = await execAsync(
        `docker port ${containerId} ${GATEWAY_PORT}/tcp`
      );
      const port = portOut.match(/:(\d+)/)?.[1] || GATEWAY_PORT;
      const containerUrl = `http://localhost:${port}`;

      await waitForHealthy(containerUrl, 30000);

      const pairingToken = await autoPair(containerUrl);

      await ctx.runMutation(internal.agents.updateStatus, {
        agentId,
        status: "running",
        containerId,
        containerUrl,
        pairingToken,
      });

      return { containerId, containerUrl };
    } catch (error: any) {
      await ctx.runMutation(internal.agents.updateStatus, {
        agentId,
        status: "error",
      });
      throw error;
    }
  },
});

async function autoPair(containerUrl: string): Promise<string> {
  const code = generatePairingCode();
  
  const response = await fetch(`${containerUrl}/pair`, {
    method: "POST",
    headers: { "X-Pairing-Code": code },
  });

  if (!response.ok) throw new Error("Auto-pairing failed");

  const { token } = await response.json();
  return token;
}

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function waitForHealthy(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok && (await res.json()).status === "ok") return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  
  throw new Error("Container health check timeout");
}

export const startContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    await execAsync(`docker start ${containerId}`);
    
    const { stdout: portOut } = await execAsync(
      `docker port ${containerId} ${GATEWAY_PORT}/tcp`
    );
    const port = portOut.match(/:(\d+)/)?.[1] || GATEWAY_PORT;
    const containerUrl = `http://localhost:${port}`;

    await waitForHealthy(containerUrl, 15000);

    await ctx.runMutation(internal.agents.updateStatus, {
      agentId,
      status: "running",
      containerUrl,
    });

    return { success: true };
  },
});

export const stopContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    await execAsync(`docker stop ${containerId}`);
    
    await ctx.runMutation(internal.agents.updateStatus, {
      agentId,
      status: "stopped",
    });

    return { success: true };
  },
});

export const removeContainer = internalAction({
  args: {
    containerId: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, { containerId, agentId }) => {
    await execAsync(`docker rm -f ${containerId}`);
    return { success: true };
  },
});

export const callAgent = internalAction({
  args: {
    containerUrl: v.string(),
    message: v.string(),
    pairingToken: v.optional(v.string()),
  },
  handler: async (ctx, { containerUrl, message, pairingToken }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (pairingToken) {
      headers["Authorization"] = `Bearer ${pairingToken}`;
    }

    const response = await fetch(`${containerUrl}/webhook`, {
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
