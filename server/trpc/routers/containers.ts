import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../../db'
import { containers } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const containersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.select().from(containers)
  }),

  byAgentId: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await db.select()
        .from(containers)
        .where(eq(containers.agentId, input.agentId))
    }),

  status: protectedProcedure
    .input(z.object({ machineId: z.string() }))
    .query(async ({ ctx, input }) => {
      return {
        machineId: input.machineId,
        status: 'running',
        region: 'iad',
      }
    }),
})
