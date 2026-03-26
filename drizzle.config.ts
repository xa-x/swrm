import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './server/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './server/data.db',
  },
} satisfies Config
