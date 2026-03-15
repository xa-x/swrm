import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const send = mutation({
  args: {
    agentId: v.id("agents"),
    content: v.string(),
  },
  returns: v.object({
    response: v.string(),
    tokens: v.number(),
  }),
  handler: async (ctx, { agentId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    if (agent.status !== "running") {
      throw new Error("Agent not running");
    }

    if (!agent.containerId) {
      throw new Error("No machine");
    }

    const result = await ctx.scheduler.runAfter(0, internal.fly.callAgent, {
      machineId: agent.containerId,
      message: content,
      pairingToken: agent.pairingToken,
    });

    // Type assertion for the result
    const response = result as unknown as { content: string; tokens: number };

    if (agent.useSwrmCredits) {
      await ctx.db.insert("usage", {
        agentId,
        inputTokens: Math.ceil(content.length / 4),
        outputTokens: response.tokens,
        cost: ((content.length / 4) + response.tokens) * 0.000002,
        provider: agent.provider,
        createdAt: Date.now(),
      });
    }

    return {
      response: response.content,
      tokens: response.tokens,
    };
  },
});
