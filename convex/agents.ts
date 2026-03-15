import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { encryptApiKey } from "./encryption";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) return null;

    return agent;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    provider: v.string(),
    apiKey: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
    useSwrmCredits: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const userId = identity.subject;
    const now = Date.now();

    if (!args.useSwrmCredits && !args.apiKey) {
      throw new Error("API key required unless using Swrm credits");
    }

    const encryptedApiKey = args.apiKey ? encryptApiKey(args.apiKey) : undefined;

    const agentId = await ctx.db.insert("agents", {
      userId,
      name: args.name,
      icon: args.icon || "🤖",
      provider: args.useSwrmCredits ? "zai" : args.provider,
      model: args.model,
      systemPrompt: args.systemPrompt,
      encryptedApiKey,
      useSwrmCredits: args.useSwrmCredits ?? false,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.docker.createContainer, {
      agentId,
      userId,
      name: args.name,
      provider: args.useSwrmCredits ? "zai" : args.provider,
      apiKey: args.apiKey || process.env.Z_AI_API_KEY || "",
      model: args.model,
      systemPrompt: args.systemPrompt,
    });

    return { agentId };
  },
});

export const update = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const { agentId, ...updates } = args;
    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agentId, {
      ...Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined)),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    if (agent.containerId) {
      await ctx.scheduler.runAfter(0, internal.docker.removeContainer, {
        containerId: agent.containerId,
        agentId,
      });
    }

    await ctx.db.delete(agentId);
    return { success: true };
  },
});

export const start = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    if (!agent.containerId) throw new Error("No container");

    await ctx.scheduler.runAfter(0, internal.docker.startContainer, {
      containerId: agent.containerId,
      agentId,
    });

    return { success: true };
  },
});

export const stop = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    if (!agent.containerId) throw new Error("No container");

    await ctx.scheduler.runAfter(0, internal.docker.stopContainer, {
      containerId: agent.containerId,
      agentId,
    });

    return { success: true };
  },
});

export const updateStatus = internalMutation({
  args: {
    agentId: v.id("agents"),
    status: v.any(),
    containerId: v.optional(v.string()),
    containerUrl: v.optional(v.string()),
    pairingToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    await ctx.db.patch(agentId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
