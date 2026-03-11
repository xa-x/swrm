import { v } from "convex/values";
import { action, httpAction } from "./_generated/server";

// Fly.io configuration
const FLY_APP_NAME = process.env.FLY_APP_NAME || "swrm-agents";
const FLY_API_TOKEN = process.env.FLY_API_TOKEN || "";

// ============ HTTP ACTIONS ============

// Call agent (ZeroClaw) running on Fly.io
export const callAgent = action({
  args: {
    agentId: v.id("agents"),
    machineId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { agentId, machineId, message }) => {
    // Get machine URL (Fly.io Machines have internal DNS)
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
        cost: 0, // Will be calculated by caller
      };
    } catch (error: any) {
      // If machine is unreachable, it might be stopped
      if (error.message?.includes("ECONNREFUSED") || error.message?.includes("timeout")) {
        throw new Error("Agent is not responding. It may be stopped or starting.");
      }
      throw error;
    }
  },
});

// Broadcast to multiple agents
export const broadcast = action({
  args: {
    agentIds: v.array(v.id("agents")),
    message: v.string(),
  },
  handler: async (ctx, { agentIds, message }) => {
    const results = await Promise.allSettled(
      agentIds.map(async (agentId) => {
        const agent = await ctx.runQuery(api.agents.get, { agentId });
        
        if (!agent || !agent.flyMachineId) {
          throw new Error(`Agent ${agentId} not available`);
        }

        const response = await ctx.scheduler.runAfter(0, internal.http.callAgent, {
          agentId,
          machineId: agent.flyMachineId,
          message,
        });

        return {
          agentId,
          agentName: agent.name,
          response: response.content,
        };
      })
    );

    return results.map((result, index) => ({
      agentId: agentIds[index],
      status: result.status,
      response: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason.message : null,
    }));
  },
});

// ============ WEBHOOK HANDLERS ============

// Handle Fly.io webhooks (machine state changes)
export const handleFlyWebhook = httpAction(async (ctx, request) => {
  const payload = await request.json();
  
  console.log("Fly webhook received:", payload);

  // Handle different event types
  if (payload.event === "machine_stopped") {
    // Update agent status
    const machineId = payload.data?.machine_id;
    if (machineId) {
      // Find agent by machine ID and update status
      // This would require a query by flyMachineId
    }
  }

  return new Response(null, { status: 200 });
});

// Health check endpoint
export const health = httpAction(async (ctx, request) => {
  return Response.json({
    status: "healthy",
    service: "swrm-convex",
    timestamp: new Date().toISOString(),
  });
});
