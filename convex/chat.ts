import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

// ============ QUERIES ============

// Get messages for a session
export const getHistory = query({
  args: {
    agentId: v.id("agents"),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, sessionId, limit = 100 }) => {
    let query = ctx.db
      .query("messages")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId));

    if (sessionId) {
      query = ctx.db
        .query("messages")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId));
    }

    return await query.order("asc").take(limit);
  },
});

// ============ MUTATIONS ============

// Send message to agent (REST API)
export const send = mutation({
  args: {
    agentId: v.id("agents"),
    sessionId: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (agent.status !== "running") {
      throw new Error("Agent is not running");
    }

    const sessionId = args.sessionId || crypto.randomUUID();
    const now = Date.now();

    // Store user message
    await ctx.db.insert("messages", {
      agentId: args.agentId,
      sessionId,
      role: "user",
      content: args.content,
      createdAt: now,
    });

    // Estimate input tokens
    const inputTokens = Math.ceil(args.content.length / 4);

    // Call ZeroClaw via HTTP (async action)
    const response = await ctx.scheduler.runAfter(0, internal.http.callAgent, {
      agentId: args.agentId,
      machineId: agent.flyMachineId!,
      message: args.content,
    });

    // Store assistant message
    await ctx.db.insert("messages", {
      agentId: args.agentId,
      sessionId,
      role: "assistant",
      content: response.content,
      tokens: response.outputTokens,
      cost: response.cost,
      createdAt: Date.now(),
    });

    // Record usage
    const cost = calculateCost(agent.provider, inputTokens, response.outputTokens);
    await ctx.db.insert("usage", {
      agentId: args.agentId,
      sessionId,
      inputTokens,
      outputTokens: response.outputTokens,
      cost,
      createdAt: Date.now(),
    });

    return {
      response: response.content,
      tokens: { input: inputTokens, output: response.outputTokens },
      cost,
      sessionId,
    };
  },
});

// ============ HELPERS ============

function calculateCost(
  provider: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Cost per 1M tokens (rough estimates)
  const costs: Record<string, { input: number; output: number }> = {
    openai: { input: 5, output: 15 },        // GPT-4o-mini
    anthropic: { input: 3, output: 15 },     // Haiku
    openrouter: { input: 5, output: 15 },
    zhipu: { input: 0.14, output: 0.14 },    // GLM-4
    ollama: { input: 0, output: 0 },         // Local
  };

  const rate = costs[provider] || costs.openai;
  const inputCost = (inputTokens / 1_000_000) * rate.input;
  const outputCost = (outputTokens / 1_000_000) * rate.output;

  return inputCost + outputCost;
}
