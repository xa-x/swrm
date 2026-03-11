import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============ QUERIES ============

// Get all agents for a user (real-time subscription)
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get single agent
export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    return await ctx.db.get(agentId);
  },
});

// Get agent status (for polling)
export const getStatus = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    if (!agent) return null;
    return {
      status: agent.status,
      containerId: agent.containerId,
      flyMachineId: agent.flyMachineId,
    };
  },
});

// Get agent actions (audit log)
export const getActions = query({
  args: { 
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 50 }) => {
    return await ctx.db
      .query("actions")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);
  },
});

// ============ MUTATIONS ============

// Create agent
export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    icon: v.optional(v.string()),
    provider: v.string(),
    apiKey: v.string(),
    model: v.optional(v.string()),
    personality: v.string(),
    customPersonality: v.optional(v.string()),
    skills: v.array(v.string()),
    budgetLimit: v.optional(v.number()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Encrypt API key (in production, use a proper encryption service)
    // For now, we'll store it (TODO: use Convex secrets or external encryption)
    const encryptedApiKey = Buffer.from(args.apiKey).toString('base64');
    
    const agentId = await ctx.db.insert("agents", {
      userId: args.userId,
      name: args.name,
      icon: args.icon || "🤖",
      provider: args.provider,
      model: args.model,
      personality: args.personality,
      customPersonality: args.customPersonality,
      skills: args.skills,
      budgetLimit: args.budgetLimit,
      region: args.region || "auto",
      encryptedApiKey,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("actions", {
      agentId,
      action: "create",
      details: { provider: args.provider },
      triggeredBy: "user",
      createdAt: now,
    });

    // Start container (async action)
    await ctx.scheduler.runAfter(0, internal.docker.createContainer, {
      agentId,
      provider: args.provider,
      apiKey: args.apiKey,
      model: args.model,
      personality: args.personality,
      skills: args.skills,
      region: args.region || "auto",
    });

    return { agentId, status: "creating" };
  },
});

// Update agent
export const update = mutation({
  args: {
    agentId: v.id("agents"),
    name: v.optional(v.string()),
    model: v.optional(v.string()),
    personality: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    budgetLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    const agent = await ctx.db.get(agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agentId, {
      ...updates,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actions", {
      agentId,
      action: "update",
      details: updates,
      triggeredBy: "user",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete agent
export const remove = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Stop container first
    if (agent.flyMachineId) {
      await ctx.scheduler.runAfter(0, internal.docker.stopContainer, {
        agentId,
        machineId: agent.flyMachineId,
      });
    }

    // Log action before deletion
    await ctx.db.insert("actions", {
      agentId,
      action: "delete",
      details: {},
      triggeredBy: "user",
      createdAt: Date.now(),
    });

    // Delete agent
    await ctx.db.delete(agentId);

    return { success: true };
  },
});

// ============ CONTAINER ACTIONS ============

// Start agent
export const start = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agentId, {
      status: "running",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actions", {
      agentId,
      action: "start",
      details: {},
      triggeredBy: "user",
      createdAt: Date.now(),
    });

    // Call Fly.io to start machine
    if (agent.flyMachineId) {
      await ctx.scheduler.runAfter(0, internal.docker.startMachine, {
        machineId: agent.flyMachineId,
      });
    }

    return { success: true, status: "running" };
  },
});

// Stop agent (graceful)
export const stop = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agentId, {
      status: "stopped",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actions", {
      agentId,
      action: "stop",
      details: {},
      triggeredBy: "user",
      createdAt: Date.now(),
    });

    // Call Fly.io to stop machine
    if (agent.flyMachineId) {
      await ctx.scheduler.runAfter(0, internal.docker.stopMachine, {
        machineId: agent.flyMachineId,
      });
    }

    return { success: true, status: "stopped" };
  },
});

// Restart agent (force)
export const restart = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const agent = await ctx.db.get(agentId);
    
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(agentId, {
      status: "running",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actions", {
      agentId,
      action: "restart",
      details: { force: true },
      triggeredBy: "user",
      createdAt: Date.now(),
    });

    // Call Fly.io to restart machine
    if (agent.flyMachineId) {
      await ctx.scheduler.runAfter(0, internal.docker.restartMachine, {
        machineId: agent.flyMachineId,
      });
    }

    return { success: true, status: "running" };
  },
});

// Update status (internal)
export const updateStatus = mutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(
      v.literal("creating"),
      v.literal("running"),
      v.literal("idle"),
      v.literal("stopped"),
      v.literal("error")
    ),
    containerId: v.optional(v.string()),
    flyMachineId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agentId, ...updates } = args;
    
    await ctx.db.patch(agentId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});
