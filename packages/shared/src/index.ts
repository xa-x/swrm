// Shared types between native, web, and convex

export type Provider = 'openai' | 'anthropic' | 'openrouter' | 'zhipu' | 'ollama' | 'custom';

export type Personality = 'professional' | 'friendly' | 'concise' | 'creative' | 'custom';

export type AgentStatus = 'creating' | 'running' | 'idle' | 'stopped' | 'error';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  provider: Provider;
  model?: string;
  personality: Personality;
  customPersonality?: string;
  skills: string[];
  budgetLimit?: number;
  status: AgentStatus;
  region?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  cost?: number;
  createdAt: number;
}

export interface UsageSummary {
  agentId?: string;
  period: 'day' | 'week' | 'month';
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  sessionCount: number;
}

export interface AgentAction {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, any>;
  triggeredBy?: string;
  createdAt: number;
}

// Provider configurations
export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🔮',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    models: ['claude-sonnet-4', 'claude-3-5-sonnet', 'claude-3-haiku'],
  },
  openrouter: {
    name: 'OpenRouter',
    icon: '🔀',
    models: ['openrouter/auto', 'anthropic/claude-sonnet-4', 'openai/gpt-4o'],
  },
  zhipu: {
    name: 'Zhipu (GLM)',
    icon: '🇨🇳',
    models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'],
  },
  ollama: {
    name: 'Ollama (Local)',
    icon: '🦙',
    models: ['llama3.2', 'llama3.1', 'qwen2.5'],
  },
} as const;

// Personality configurations
export const PERSONALITIES = {
  professional: {
    name: 'Professional',
    description: 'Thorough, accurate, formal',
  },
  friendly: {
    name: 'Friendly',
    description: 'Warm, approachable, conversational',
  },
  concise: {
    name: 'Direct',
    description: 'Brief, to the point, no fluff',
  },
  creative: {
    name: 'Creative',
    description: 'Think outside the box',
  },
} as const;

// Region configurations
export const REGIONS = {
  auto: { name: 'Auto', code: 'auto' },
  'us-east': { name: 'US East', code: 'iad' },
  'us-west': { name: 'US West', code: 'sea' },
  'eu-west': { name: 'EU West', code: 'fra' },
  'ap-southeast': { name: 'Asia Pacific', code: 'sin' },
} as const;
