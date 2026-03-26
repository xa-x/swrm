import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  config: text('config', { mode: 'json' }).$type<{
    model?: string
    systemPrompt?: string
    apiKey?: string
    tools?: string[]
  }>(),
  status: text('status').$type<'idle' | 'running' | 'stopped'>().notNull().default('idle'),
  machineId: text('machine_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  stoppedAt: integer('stopped_at', { mode: 'timestamp' }),
})

export const logs = sqliteTable('logs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  action: text('action').notNull(),
  input: text('input', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const containers = sqliteTable('containers', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  machineId: text('machine_id').notNull(),
  status: text('status').$type<'starting' | 'running' | 'stopped' | 'failed'>().notNull(),
  region: text('region'),
  config: text('config', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
