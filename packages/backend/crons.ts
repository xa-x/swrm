import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old sessions (daily at midnight)
crons.weekly(
  "cleanup_old_sessions",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
  internal.crons.cleanupSessions
);

// Check for stalled agents (every hour)
crons.hourly(
  "check_stalled_agents",
  { minuteUTC: 0 },
  internal.crons.checkStalledAgents
);

// Calculate usage stats (daily at midnight)
crons.daily(
  "calculate_usage_stats",
  { hourUTC: 0, minuteUTC: 0 },
  internal.crons.calculateUsageStats
);

export default crons;

// ============ CRON HANDLERS ============

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Clean up sessions older than 30 days
export const cleanupSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("sessions")
      .filter((q) => q.lt(q.field("startedAt"), thirtyDaysAgo))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    console.log(`Cleaned up ${sessions.length} old sessions`);
  },
});

// Check for agents stuck in "creating" state
export const checkStalledAgents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const stalled = await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", "creating"))
      .filter((q) => q.lt(q.field("createdAt"), tenMinutesAgo))
      .collect();

    for (const agent of stalled) {
      await ctx.db.patch(agent._id, {
        status: "error",
        updatedAt: Date.now(),
      });

      await ctx.db.insert("actions", {
        agentId: agent._id,
        action: "error",
        details: { reason: "Agent creation timed out" },
        createdAt: Date.now(),
      });
    }

    console.log(`Marked ${stalled.length} stalled agents as error`);
  },
});

// Calculate daily usage stats
export const calculateUsageStats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const usage = await ctx.db
      .query("usage")
      .withIndex("by_created", (q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect();

    const stats = {
      totalAgents: 0,
      activeAgents: new Set<string>(),
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0,
    };

    for (const record of usage) {
      stats.activeAgents.add(record.agentId);
      stats.totalTokens += record.inputTokens + record.outputTokens;
      stats.totalCost += record.cost;
    }

    stats.totalMessages = usage.length;
    stats.totalAgents = stats.activeAgents.size;

    console.log("Daily stats:", stats);

    // Could store in a stats table or send to monitoring
    return stats;
  },
});
