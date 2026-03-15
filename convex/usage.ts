/**
 * Swrm Credits Tracking
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const trackUsage = internalMutation({
  args: {
    agentId: v.id("agents"),
    inputTokens: v.number(),
    outputTokens: v.optional(v.number()),
    cost: v.number(),
  },
  handler: async (ctx, { agentId, inputTokens, outputTokens, cost }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent?.useSwrmCredits) return;

    await ctx.db.insert("usage", {
      agentId,
      inputTokens,
      outputTokens: outputTokens ?? 0,
      cost,
      provider: agent.provider,
      createdAt: Date.now(),
    });
  },
});
