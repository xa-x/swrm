import { initTRPC } from '@trpc/server'
import superjson from 'superjson'

export const t = initTRPC.create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Protected procedure - requires auth
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // TODO: Add Clerk auth check
  // const userId = ctx.req.headers.get('x-user-id')
  // if (!userId) throw new Error('Unauthorized')
  return next()
})
