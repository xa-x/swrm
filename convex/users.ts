import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();
  },
});

export const upsertFromClerk = internalMutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email ?? existing.email,
        name: args.name ?? existing.name,
        plan: args.plan ?? existing.plan,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      userId: args.userId,
      email: args.email,
      name: args.name,
      plan: args.plan ?? "free",
      storageUsedMb: 0,
      storageLimitMb: 1024,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePlan = internalMutation({
  args: {
    userId: v.string(),
    plan: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existing) {
      return await ctx.db.insert("users", {
        userId: args.userId,
        plan: args.plan,
        storageUsedMb: 0,
        storageLimitMb: 1024,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(existing._id, {
      plan: args.plan,
      updatedAt: now,
    });
  },
});

export const updateStorage = mutation({
  args: {
    storageMb: v.number(),
  },
  handler: async (ctx, { storageMb }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      storageUsedMb: storageMb,
      updatedAt: Date.now(),
    });
  },
});
