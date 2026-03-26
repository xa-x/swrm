import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../swrm-server/src/trpc'
import superjson from 'superjson'

export const trpc = createTRPCReact<AppRouter>()
