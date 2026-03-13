import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  agents: defineTable({
    userId: v.string(),
    name: v.string(),
    icon: v.optional(v.string()),
    provider: v.string(),
    model: v.optional(v.string()),
    personality: v.string(),
    customPersonality: v.optional(v.string()),
    skills: v.array(v.string()),
    budgetLimit: v.optional(v.number()),
    containerId: v.optional(v.string()),
    flyMachineId: v.optional(v.string()),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("idle"),
      v.literal("stopped"),
      v.literal("error")
    ),
    region: v.optional(v.string()),
    encryptedApiKey: v.string(),
    pairingToken: v.optional(v.string()),
    pairingCode: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  messages: defineTable({
    agentId: v.id("agents"),
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    tokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_session", ["sessionId"]),

  sessions: defineTable({
    agentId: v.id("agents"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    messageCount: v.number(),
    totalCost: v.number(),
  })
    .index("by_agent", ["agentId"]),

  usage: defineTable({
    agentId: v.id("agents"),
    sessionId: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cost: v.number(),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"]),

  actions: defineTable({
    agentId: v.id("agents"),
    action: v.string(),
    details: v.any(),
    triggeredBy: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_created", ["createdAt"]),

  pushTokens: defineTable({
    userId: v.string(),
    token: v.string(),
    deviceId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
