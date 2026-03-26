import { router } from './trpc'
import { agentsRouter } from './routers/agents'
import { logsRouter } from './routers/logs'
import { containersRouter } from './routers/containers'

export const appRouter = router({
  agents: agentsRouter,
  logs: logsRouter,
  containers: containersRouter,
})

export type AppRouter = typeof appRouter
