#!/usr/bin/env bun
/**
 * Standalone API server for native mobile apps
 * Run this when testing on iOS/Android
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './server/trpc'
import { serve } from '@hono/node-server'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['*'], // Allow all origins in development
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ 
  ok: true, 
  timestamp: new Date().toISOString(),
  server: 'swrm-api'
}))

// tRPC
app.all('/trpc/*', async (c) => {
  const req = c.req.raw
  const res = await fetchRequestHandler({
    endpoint: '/trpc',
    req,
    router: appRouter,
    createContext: async () => ({
      req,
    }),
    onError: ({ error, path }) => {
      console.error(`tRPC Error on ${path}:`, error)
    },
  })
  return res
})

// Start server
const port = parseInt(process.env.PORT || '3001')
console.log(`🐝 Swrm API server running on http://localhost:${port}`)
console.log(`   Health: http://localhost:${port}/health`)
console.log(`   tRPC:  http://localhost:${port}/trpc`)

serve({
  fetch: app.fetch,
  port,
})
