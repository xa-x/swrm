import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../../db'
import { logs } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const logsRouter = router({
  list: protectedProcedure
    .input(z.object({
      agentId: z.string().optional(),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ ctx, input }) => {
      let query = db.select().from(logs)
      
      if (input.agentId) {
        query = query.where(eq(logs.agentId, input.agentId)) as any
      }
      
      return await query.orderBy(desc(logs.createdAt)).limit(input.limit)
    }),

  create: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      action: z.string(),
      input: z.any().optional(),
      output: z.any().optional(),
      error: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [log] = await db.insert(logs).values({
        id: nanoid(),
        agentId: input.agentId,
        action: input.action,
        input: input.input,
        output: input.output,
        error: input.error,
      }).returning()
      
      return log
    }),
})
