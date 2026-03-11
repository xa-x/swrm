import { z } from 'zod';

// Provider types
export const ProviderSchema = z.enum([
  'openai',
  'anthropic',
  'openrouter',
  'zhipu',
  'ollama',
  'custom',
]);

export type Provider = z.infer<typeof ProviderSchema>;

// Agent personality
export const PersonalitySchema = z.enum([
  'professional',
  'friendly',
  'concise',
  'creative',
  'custom',
]);

export type Personality = z.infer<typeof PersonalitySchema>;

// Region
export const RegionSchema = z.enum([
  'auto',
  'us-east',
  'us-west',
  'eu-west',
  'ap-southeast',
]);

export type Region = z.infer<typeof RegionSchema>;

// Agent creation schema
export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(50),
  provider: ProviderSchema,
  apiKey: z.string().min(1),
  model: z.string().optional(),
  personality: PersonalitySchema,
  customPersonality: z.string().optional(),
  skills: z.array(z.string()).default([]),
  budgetLimit: z.number().optional(),
  region: RegionSchema.optional(),
});

export type CreateAgent = z.infer<typeof CreateAgentSchema>;

// Agent config
export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  provider: Provider;
  model?: string;
  personality: Personality;
  customPersonality?: string;
  skills: string[];
  budgetLimit?: number;
  containerId?: string;
  status: 'creating' | 'running' | 'idle' | 'stopped' | 'error';
  region?: Region;
  createdAt: Date;
  updatedAt: Date;
}

// Usage tracking
export interface UsageRecord {
  id: string;
  agentId: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number; // in USD
  timestamp: Date;
}

export interface UsageSummary {
  agentId: string;
  period: 'day' | 'week' | 'month';
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  sessionCount: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  timestamp: Date;
}

// Push notification
export const PushTokenSchema = z.object({
  userId: z.string(),
  token: z.string(),
  deviceId: z.string().optional(),
});

export type PushToken = z.infer<typeof PushTokenSchema>;

// Agent action (for logging)
export interface AgentAction {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, any>;
  triggeredBy?: string;
  timestamp: Date;
}
