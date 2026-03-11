import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

// ============ QUERIES ============

// Get usage for a single agent
export const getByAgent = query({
  args: {
    agentId: v.id("agents"),
    period: v.optional(v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    )),
  },
  handler: async (ctx, { agentId, period = "month" }) => {
    const intervals = {
      day: 1 * 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const since = Date.now() - intervals[period];

    const records = await ctx.db
      .query("usage")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    return {
      records,
      summary: {
        agentId,
        period,
        totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
        totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
        totalCost: records.reduce((sum, r) => sum + r.cost, 0),
        sessionCount: new Set(records.map((r) => r.sessionId)).size,
      },
    };
  },
});

// Get usage for all user's agents
export const getByUser = query({
  args: {
    userId: v.string(),
    period: v.optional(v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    )),
  },
  handler: async (ctx, { userId, period = "month" }) => {
    const intervals = {
      day: 1 * 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };

    const since = Date.now() - intervals[period];

    // Get all user's agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const agentIds = agents.map((a) => a._id);

    // Get usage for all agents
    const allUsage = [];
    for (const agentId of agentIds) {
      const records = await ctx.db
        .query("usage")
        .withIndex("by_agent", (q) => q.eq("agentId", agentId))
        .filter((q) => q.gte(q.field("createdAt"), since))
        .collect();

      allUsage.push({
        agent: {
          id: agentId,
          name: agents.find((a) => a._id === agentId)?.name,
        },
        usage: {
          totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
          totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
          totalCost: records.reduce((sum, r) => sum + r.cost, 0),
          sessionCount: new Set(records.map((r) => r.sessionId)).size,
        },
      });
    }

    return {
      period,
      agents: allUsage,
      totals: {
        totalInputTokens: allUsage.reduce((sum, a) => sum + a.usage.totalInputTokens, 0),
        totalOutputTokens: allUsage.reduce((sum, a) => sum + a.usage.totalOutputTokens, 0),
        totalCost: allUsage.reduce((sum, a) => sum + a.usage.totalCost, 0),
        totalSessions: allUsage.reduce((sum, a) => sum + a.usage.sessionCount, 0),
      },
    };
  },
});

// ============ INTERNAL MUTATIONS ============

// Record usage (called by chat functions)
export const record = internalMutation({
  args: {
    agentId: v.id("agents"),
    sessionId: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usage", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
