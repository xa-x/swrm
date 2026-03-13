import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('agenthive.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🤖',
      provider TEXT NOT NULL,
      model TEXT,
      personality TEXT DEFAULT 'professional',
      skills TEXT DEFAULT '[]',
      status TEXT DEFAULT 'stopped',
      region TEXT DEFAULT 'auto',
      budget_limit REAL,
      monthly_cost REAL DEFAULT 0,
      last_active TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      tokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT,
      message_count INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS cached_usage (
      agent_id TEXT NOT NULL,
      period TEXT NOT NULL,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      session_count INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (agent_id, period)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
  `);

  console.log('✅ Database initialized');
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Agent operations
export const agentsDb = {
  async getAll(): Promise<LocalAgent[]> {
    const result = await getDb().getAllAsync<LocalAgent>(
      'SELECT * FROM agents ORDER BY last_active DESC'
    );
    return result;
  },

  async getById(id: string): Promise<LocalAgent | null> {
    const result = await getDb().getAsync<LocalAgent>(
      'SELECT * FROM agents WHERE id = ?',
      id
    );
    return result || null;
  },

  async upsert(agent: Partial<LocalAgent>): Promise<void> {
    await getDb().runAsync(
      `INSERT OR REPLACE INTO agents 
       (id, name, icon, provider, model, personality, skills, status, region, budget_limit, monthly_cost, last_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM agents WHERE id = ?), CURRENT_TIMESTAMP))`,
      [
        agent.id!,
        agent.name!,
        agent.icon || '🤖',
        agent.provider!,
        agent.model || null,
        agent.personality || 'professional',
        JSON.stringify(agent.skills || []),
        agent.status || 'stopped',
        agent.region || 'auto',
        agent.budgetLimit || null,
        agent.monthlyCost || 0,
        agent.lastActive || new Date().toISOString(),
        agent.id!,
      ]
    );
  },

  async updateStatus(id: string, status: AgentStatus): Promise<void> {
    await getDb().runAsync(
      'UPDATE agents SET status = ?, last_active = ? WHERE id = ?',
      [status, new Date().toISOString(), id]
    );
  },

  async updateCost(id: string, cost: number): Promise<void> {
    await getDb().runAsync(
      'UPDATE agents SET monthly_cost = monthly_cost + ? WHERE id = ?',
      [cost, id]
    );
  },

  async delete(id: string): Promise<void> {
    await getDb().runAsync('DELETE FROM agents WHERE id = ?', [id]);
    await getDb().runAsync('DELETE FROM messages WHERE agent_id = ?', [id]);
    await getDb().runAsync('DELETE FROM sessions WHERE agent_id = ?', [id]);
  },
};

// Message operations
export const messagesDb = {
  async getBySession(sessionId: string): Promise<LocalMessage[]> {
    return getDb().getAllAsync<LocalMessage>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      sessionId
    );
  },

  async getRecent(agentId: string, limit = 50): Promise<LocalMessage[]> {
    return getDb().getAllAsync<LocalMessage>(
      `SELECT * FROM messages 
       WHERE agent_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [agentId, limit]
    );
  },

  async add(message: Omit<LocalMessage, 'id' | 'createdAt'>): Promise<string> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    await getDb().runAsync(
      `INSERT INTO messages (id, agent_id, session_id, role, content, attachments, tokens, cost, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        message.agentId,
        message.sessionId,
        message.role,
        message.content,
        JSON.stringify(message.attachments || []),
        message.tokens || 0,
        message.cost || 0,
        new Date().toISOString(),
      ]
    );
    return id;
  },
};

// Session operations
export const sessionsDb = {
  async create(agentId: string): Promise<string> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
    await getDb().runAsync(
      'INSERT INTO sessions (id, agent_id) VALUES (?, ?)',
      [id, agentId]
    );
    return id;
  },

  async end(sessionId: string): Promise<void> {
    await getDb().runAsync(
      `UPDATE sessions 
       SET ended_at = CURRENT_TIMESTAMP,
           message_count = (SELECT COUNT(*) FROM messages WHERE session_id = ?),
           total_cost = (SELECT COALESCE(SUM(cost), 0) FROM messages WHERE session_id = ?)
       WHERE id = ?`,
      [sessionId, sessionId, sessionId]
    );
  },

  async getActive(agentId: string): Promise<string | null> {
    const result = await getDb().getAsync<{ id: string }>(
      'SELECT id FROM sessions WHERE agent_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
      [agentId]
    );
    return result?.id || null;
  },
};

// Types
export interface LocalAgent {
  id: string;
  name: string;
  icon: string;
  provider: string;
  model?: string;
  personality: string;
  skills: string[];
  status: AgentStatus;
  region: string;
  budgetLimit?: number;
  monthlyCost: number;
  lastActive: string;
  createdAt: string;
}

export type AgentStatus = 'creating' | 'running' | 'idle' | 'stopped' | 'error';

export interface LocalMessage {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  tokens: number;
  cost: number;
  createdAt: string;
}

export interface Attachment {
  type: 'image' | 'file' | 'voice';
  name: string;
  uri: string;
  size?: number;
}
