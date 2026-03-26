import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '../../server/trpc'
import type { TRPCError } from '@trpc/server'

export default function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: async () => ({
      req: request,
    }),
    onError: ({ error, path }: { error: TRPCError; path: string }) => {
      console.error(`tRPC Error on ${path}:`, error)
    },
  })
}
