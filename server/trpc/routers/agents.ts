import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../../db'
import { agents } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = 'demo-user'
    return await db.select().from(agents).where(eq(agents.userId, userId))
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await db.select().from(agents).where(eq(agents.id, input.id))
      
      if (!agent) {
        throw new Error('Not found')
      }
      
      return agent
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(['claude', 'gpt', 'cursor', 'custom']),
      config: z.object({
        model: z.string().optional(),
        systemPrompt: z.string().optional(),
        tools: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = 'demo-user'
      
      const [agent] = await db.insert(agents).values({
        id: nanoid(),
        userId,
        name: input.name,
        type: input.type,
        config: input.config || {},
        status: 'idle',
      }).returning()
      
      return agent
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      config: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db.select().from(agents).where(eq(agents.id, input.id))
      if (!agent) {
        throw new Error('Not found')
      }
      
      const [updated] = await db.update(agents)
        .set({
          name: input.name,
          config: input.config,
        })
        .where(eq(agents.id, input.id))
        .returning()
      
      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db.select().from(agents).where(eq(agents.id, input.id))
      if (!agent) {
        throw new Error('Not found')
      }
      
      await db.delete(agents).where(eq(agents.id, input.id))
      
      return { success: true }
    }),

  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db.select().from(agents).where(eq(agents.id, input.id))
      if (!agent) {
        throw new Error('Not found')
      }
      
      const machineId = `machine_${nanoid()}`
      
      const [updated] = await db.update(agents)
        .set({
          status: 'running',
          machineId,
          startedAt: new Date(),
        })
        .where(eq(agents.id, input.id))
        .returning()
      
      return updated
    }),

  stop: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db.select().from(agents).where(eq(agents.id, input.id))
      if (!agent) {
        throw new Error('Not found')
      }
      
      const [updated] = await db.update(agents)
        .set({
          status: 'stopped',
          stoppedAt: new Date(),
        })
        .where(eq(agents.id, input.id))
        .returning()
      
      return updated
    }),
})
