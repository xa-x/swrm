import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users
  users: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    plan: v.optional(v.string()),
    storageUsedMb: v.optional(v.number()),
    storageLimitMb: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Agents
  agents: defineTable({
    userId: v.string(),
    name: v.string(),
    icon: v.optional(v.string()),
    provider: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
    encryptedApiKey: v.optional(v.string()),
    useSwrmCredits: v.optional(v.boolean()),
    containerId: v.optional(v.string()),
    containerUrl: v.optional(v.string()),
    pairingToken: v.optional(v.string()),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("error")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Usage (for Z AI credits tracking)
  usage: defineTable({
    agentId: v.id("agents"),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    provider: v.string(),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"]),

  // Billing
  billing: defineTable({
    userId: v.string(),
    agentsCount: v.number(),
    storageGb: v.number(),
    agentCost: v.number(),
    storageCost: v.number(),
    totalCost: v.number(),
    status: v.string(),
    billedAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
});
