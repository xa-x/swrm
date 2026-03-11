import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Log agent action (internal)
export const log = internalMutation({
  args: {
    agentId: v.id("agents"),
    action: v.string(),
    details: v.optional(v.any()),
    triggeredBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("actions", {
      agentId: args.agentId,
      action: args.action,
      details: args.details || {},
      triggeredBy: args.triggeredBy || "system",
      createdAt: Date.now(),
    });
  },
});
