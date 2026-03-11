import { Database } from 'bun:sqlite';
import { randomUUID } from 'crypto';
import type { AgentConfig, UsageRecord, ChatMessage } from '../types';

// Initialize database
const db = new Database('agenthive.db', { create: true });

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT,
    personality TEXT NOT NULL,
    customPersonality TEXT,
    skills TEXT,
    budgetLimit REAL,
    containerId TEXT,
    status TEXT DEFAULT 'creating',
    region TEXT DEFAULT 'auto',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS usage (
    id TEXT PRIMARY KEY,
    agentId TEXT NOT NULL,
    sessionId TEXT NOT NULL,
    inputTokens INTEGER DEFAULT 0,
    outputTokens INTEGER DEFAULT 0,
    cost REAL DEFAULT 0,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agentId) REFERENCES agents(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS actions (
    id TEXT PRIMARY KEY,
    agentId TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    triggeredBy TEXT DEFAULT 'system',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agentId) REFERENCES agents(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS push_tokens (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    token TEXT NOT NULL,
    deviceId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_actions_agent ON actions(agentId)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_usage_agent ON usage(agentId)`);

// Agent operations
export const agents = {
  create: (data: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt' | 'status'>): AgentConfig => {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    db.run(`
      INSERT INTO agents (id, userId, name, provider, model, personality, customPersonality, skills, budgetLimit, status, region, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'creating', ?, ?, ?)
    `, [
      id,
      data.userId,
      data.name,
      data.provider,
      data.model || null,
      data.personality,
      data.customPersonality || null,
      JSON.stringify(data.skills || []),
      data.budgetLimit || null,
      data.region || 'auto',
      now,
      now,
    ]);

    return {
      id,
      ...data,
      status: 'creating',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    } as AgentConfig;
  },

  findById: (id: string): AgentConfig | null => {
    const row = db.query(`
      SELECT * FROM agents WHERE id = ?
    `).get(id);
    
    if (!row) return null;
    return rowToAgent(row as any);
  },

  findByUser: (userId: string): AgentConfig[] => {
    const rows = db.query(`
      SELECT * FROM agents WHERE userId = ? ORDER BY updatedAt DESC
    `).all(userId);
    
    return (rows as any[]).map(rowToAgent);
  },

  updateStatus: (id: string, status: AgentConfig['status'], containerId?: string): void => {
    db.run(`
      UPDATE agents SET status = ?, containerId = ?, updatedAt = ? WHERE id = ?
    `, [status, containerId || null, new Date().toISOString(), id]);
  },

  update: (id: string, data: Partial<AgentConfig>): void => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), new Date().toISOString(), id];
    
    db.run(`
      UPDATE agents SET ${fields}, updatedAt = ? WHERE id = ?
    `, values);
  },

  delete: (id: string): void => {
    db.run(`DELETE FROM agents WHERE id = ?`, [id]);
    db.run(`DELETE FROM usage WHERE agentId = ?`, [id]);
    db.run(`DELETE FROM actions WHERE agentId = ?`, [id]);
  },

  // Action logging
  logAction: (agentId: string, action: string, details?: Record<string, any>): void => {
    db.run(`
      INSERT INTO actions (id, agentId, action, details, triggeredBy, timestamp)
      VALUES (?, ?, ?, ?, 'user', ?)
    `, [randomUUID(), agentId, action, JSON.stringify(details || {}), new Date().toISOString()]);
  },

  getActions: (agentId: string, limit = 50): AgentAction[] => {
    const rows = db.query(`
      SELECT * FROM actions WHERE agentId = ? ORDER BY timestamp DESC LIMIT ?
    `).all(agentId, limit);
    
    return (rows as any[]).map(row => ({
      id: row.id,
      agentId: row.agentId,
      action: row.action,
      details: JSON.parse(row.details || '{}'),
      triggeredBy: row.triggeredBy,
      timestamp: new Date(row.timestamp),
    }));
  },
};

// Usage operations
export const usage = {
  record: (data: Omit<UsageRecord, 'id'>): UsageRecord => {
    const id = randomUUID();
    
    db.run(`
      INSERT INTO usage (id, agentId, sessionId, inputTokens, outputTokens, cost, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, data.agentId, data.sessionId, data.inputTokens, data.outputTokens, data.cost, data.timestamp.toISOString()]);

    return { id, ...data };
  },

  getByAgent: (agentId: string, period: 'day' | 'week' | 'month' = 'month'): UsageRecord[] => {
    const interval = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
    }[period];

    const rows = db.query(`
      SELECT * FROM usage 
      WHERE agentId = ? AND timestamp >= datetime('now', '-${interval}')
      ORDER BY timestamp DESC
    `).all(agentId);

    return rows as UsageRecord[];
  },

  getSummary: (agentId: string, period: 'day' | 'week' | 'month' = 'month') => {
    const records = usage.getByAgent(agentId, period);
    
    return {
      agentId,
      period,
      totalInputTokens: records.reduce((sum, r) => sum + r.inputTokens, 0),
      totalOutputTokens: records.reduce((sum, r) => sum + r.outputTokens, 0),
      totalCost: records.reduce((sum, r) => sum + r.cost, 0),
      sessionCount: new Set(records.map(r => r.sessionId)).size,
    };
  },

  getTotalByUser: (userId: string): { totalCost: number; totalTokens: number } => {
    const userAgents = agents.findByUser(userId);
    const agentIds = userAgents.map(a => a.id);
    
    if (agentIds.length === 0) return { totalCost: 0, totalTokens: 0 };
    
    const placeholders = agentIds.map(() => '?').join(',');
    const row = db.query(`
      SELECT 
        COALESCE(SUM(cost), 0) as totalCost,
        COALESCE(SUM(inputTokens + outputTokens), 0) as totalTokens
      FROM usage WHERE agentId IN (${placeholders})
    `).get(...agentIds) as any;
    
    return {
      totalCost: row?.totalCost || 0,
      totalTokens: row?.totalTokens || 0,
    };
  },
};

// Push token operations
export const pushTokens = {
  upsert: (userId: string, token: string, deviceId?: string): void => {
    db.run(`
      INSERT INTO push_tokens (id, userId, token, deviceId, createdAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET token = ?, deviceId = ?
    `, [randomUUID(), userId, token, deviceId || null, new Date().toISOString(), token, deviceId || null]);
  },

  getByUser: (userId: string): { token: string } | null => {
    const row = db.query(`SELECT token FROM push_tokens WHERE userId = ?`).get(userId);
    return row as { token: string } | null;
  },
};

// Types
export interface AgentAction {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, any>;
  triggeredBy?: string;
  timestamp: Date;
}

// Helper
function rowToAgent(row: any): AgentConfig {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    provider: row.provider,
    model: row.model,
    personality: row.personality,
    customPersonality: row.customPersonality,
    skills: JSON.parse(row.skills || '[]'),
    budgetLimit: row.budgetLimit,
    containerId: row.containerId,
    status: row.status,
    region: row.region || 'auto',
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  } as AgentConfig;
}

export { db };
