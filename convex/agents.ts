/**
 * Agent Management API
 * 
 * SECURITY: All mutations verify authentication and ownership.
 * Queries filter by authenticated user.
 * 
 * Container operations route via containers.ts to Docker (dev) or Fly (prod).
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getContainerApi, USE_DOCKER_BACKEND } from "./containers";

// ============ QUERIES ============

/**
 * Test auth status on the backend
 */
export const authTest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

/**
 * Get all agents for a user (real-time subscription)
 * SECURITY: Only returns agents owned by the authenticated user
 */
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    // SECURITY: Verify identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Please sign in");
    }

    // SECURITY: Only return user's own agents
    if (userId !== identity.subject) {
      throw new Error("Unauthorized: Cannot access other users' agents");
    }

    return await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get single agent
 * SECURITY: Only returns if owned by authenticated user
 */
export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Please sign in");
    }

    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    return agent;
  },
});

/**
 * Get agent status (for polling)
 */
export const getStatus = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      return null;
    }

    return {
      status: agent.status,
      containerId: agent.containerId,
      flyMachineId: agent.flyMachineId,
    };
  },
});

/**
 * Get agent actions (audit log)
 */
export const getActions = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { agentId, limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    return await ctx.db
      .query("actions")
      .withIndex("by_agent", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);
  },
});

// ============ MUTATIONS ============

/**
 * Create agent
 * SECURITY: Uses authenticated user's ID, ignores provided userId
 * 
 * TODO: API key encryption - base64 is NOT secure encryption!
 * Use Convex secrets or an external KMS in production.
 */
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
    // SECURITY: Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Please sign in");
    }

    // SECURITY: Always use authenticated user's ID
    const userId = identity.subject;
    const now = Date.now();

    // TODO: Use proper encryption for API keys
    // WARNING: base64 is NOT encryption, just encoding
    const encryptedApiKey = btoa(args.apiKey);

    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();

    const agentId = await ctx.db.insert("agents", {
      userId, // Use authenticated user ID
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
      pairingCode,
      status: "creating",
      createdAt: now,
      updatedAt: now,
    });

    // Log action
    await ctx.db.insert("actions", {
      agentId,
      action: "create",
      details: { provider: args.provider },
      triggeredBy: userId,
      createdAt: now,
    });

    // Start container via containers module (routes to Docker/Fly)
    const containerApi = getContainerApi();
    await ctx.scheduler.runAfter(0, containerApi.createContainer, {
      agentId,
      userId,
      name: args.name,
      provider: args.provider,
      apiKey: args.apiKey,
      model: args.model,
      personality: args.personality,
      customPersonality: args.customPersonality,
      skills: args.skills,
      region: args.region || "auto",
      pairingCode,
    });

    return { agentId, status: "creating" };
  },
});

/**
 * Update agent
 */
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Please sign in");
    }

    const { agentId, ...updates } = args;
    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
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
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete agent
 */
export const remove = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Please sign in");
    }

    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    // Stop/remove container via containers module
    const containerRef = agent.containerId || agent.flyMachineId;
    const containerApi = getContainerApi();
    if (containerRef) {
      await ctx.scheduler.runAfter(0, containerApi.removeContainer, {
        containerId: containerRef,
        agentId,
      });
    }

    // Log action before deletion
    await ctx.db.insert("actions", {
      agentId,
      action: "delete",
      details: {},
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    // Delete agent
    await ctx.db.delete(agentId);

    return { success: true };
  },
});

// ============ CONTAINER ACTIONS ============

/**
 * Start agent
 */
export const start = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
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
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    // Start container via containers module
    const containerRef = agent.containerId || agent.flyMachineId;
    const containerApi = getContainerApi();
    if (containerRef) {
      await ctx.scheduler.runAfter(0, containerApi.startContainer, {
        containerId: containerRef,
        agentId,
      });
    }

    return { success: true, status: "running" };
  },
});

/**
 * Stop agent (graceful)
 */
export const stop = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
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
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    // Stop container via containers module
    const containerRef = agent.containerId || agent.flyMachineId;
    const containerApi = getContainerApi();
    if (containerRef) {
      await ctx.scheduler.runAfter(0, containerApi.stopContainer, {
        containerId: containerRef,
        agentId,
      });
    }

    return { success: true, status: "stopped" };
  },
});

/**
 * Restart agent (force)
 */
export const restart = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, { agentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);

    if (!agent || agent.userId !== identity.subject) {
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
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    // Restart via containers module (stop + start)
    const containerRef = agent.containerId || agent.flyMachineId;
    const containerApi = getContainerApi();
    if (containerRef) {
      await ctx.scheduler.runAfter(0, containerApi.stopContainer, {
        containerId: containerRef,
        agentId,
      });
      await ctx.scheduler.runAfter(1000, containerApi.startContainer, {
        containerId: containerRef,
        agentId,
      });
    }

    return { success: true, status: "running" };
  },
});

/**
 * Pair agent with a client
 * SECURITY: Check agent ownership and pairing code
 */
export const pair = mutation({
  args: {
    agentId: v.id("agents"),
    code: v.string(),
  },
  handler: async (ctx, { agentId, code }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const agent = await ctx.db.get(agentId);
    if (!agent || agent.userId !== identity.subject) {
      throw new Error("Agent not found");
    }

    if (agent.pairingCode !== code) {
      throw new Error("Invalid pairing code");
    }

    // Generate a pairing token (UUID-like)
    const pairingToken = crypto.randomUUID();

    await ctx.db.patch(agentId, {
      pairingToken,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("actions", {
      agentId,
      action: "paired",
      details: { timestamp: Date.now() },
      triggeredBy: identity.subject,
      createdAt: Date.now(),
    });

    return { pairingToken };
  },
});


// ============ INTERNAL MUTATIONS ============

/**
 * Update status (internal use only)
 * Called by container actions to update agent status
 */
export const updateStatus = internalMutation({
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
