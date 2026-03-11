import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async setToken(token: string | null) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem('auth_token', token);
    } else {
      await AsyncStorage.removeItem('auth_token');
    }
  }

  async loadToken() {
    this.token = await AsyncStorage.getItem('auth_token');
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth header
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // For demo, use X-User-Id header
    const userId = await AsyncStorage.getItem('user_id');
    if (userId) {
      headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Agents
  async getAgents() {
    return this.request<{ agents: Agent[] }>('/agents');
  }

  async getAgent(id: string) {
    return this.request<{ agent: Agent; container?: { status: string; port?: number } }>(`/agents/${id}`);
  }

  async createAgent(data: CreateAgentInput) {
    return this.request<{ agent: Agent; status: string }>('/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAgent(id: string, data: Partial<Agent>) {
    return this.request<{ success: boolean }>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAgent(id: string) {
    return this.request<{ success: boolean }>(`/agents/${id}`, {
      method: 'DELETE',
    });
  }

  async startAgent(id: string) {
    return this.request<{ success: boolean; status: string }>(`/agents/${id}/start`, {
      method: 'POST',
    });
  }

  async stopAgent(id: string) {
    return this.request<{ success: boolean; status: string }>(`/agents/${id}/stop`, {
      method: 'POST',
    });
  }

  async pauseAgent(id: string) {
    return this.request<{ success: boolean; status: string }>(`/agents/${id}/pause`, {
      method: 'POST',
    });
  }

  async restartAgent(id: string) {
    return this.request<{ success: boolean; status: string }>(`/agents/${id}/restart`, {
      method: 'POST',
    });
  }

  async killAgent(id: string) {
    return this.request<{ success: boolean; status: string }>(`/agents/${id}/kill`, {
      method: 'POST',
    });
  }

  async getAgentLogs(id: string) {
    return this.request<{ logs: string }>(`/agents/${id}/logs`);
  }

  async getAgentStats(id: string) {
    return this.request<{ stats: ContainerStats }>(`/agents/${id}/stats`);
  }

  async getAgentActions(id: string) {
    return this.request<{ actions: AgentAction[] }>(`/agents/${id}/actions`);
  }

  // Chat
  async sendMessage(agentId: string, message: string, sessionId?: string) {
    return this.request<{ response: string; tokens: { input: number; output: number }; cost: number }>(
      `/chat/${agentId}`,
      {
        method: 'POST',
        body: JSON.stringify({ message, sessionId }),
      }
    );
  }

  async getChatHistory(agentId: string, sessionId?: string) {
    const params = sessionId ? `?sessionId=${sessionId}` : '';
    return this.request<{ history: ChatMessage[] }>(`/chat/${agentId}/history${params}`);
  }

  // Usage
  async getUsage(agentId: string, period: 'day' | 'week' | 'month' = 'month') {
    return this.request<{ summary: UsageSummary; records: UsageRecord[] }>(
      `/usage/${agentId}?period=${period}`
    );
  }

  async getAllUsage(period: 'day' | 'week' | 'month' = 'month') {
    return this.request<{
      period: string;
      agents: { agent: { id: string; name: string }; usage: UsageSummary }[];
      totals: UsageSummary;
    }>(`/usage?period=${period}`);
  }

  // Push notifications
  async registerPushToken(token: string, deviceId?: string) {
    return this.request<{ success: boolean }>('/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, deviceId }),
    });
  }
}

export const api = new ApiClient(API_URL);

// Types
export interface Agent {
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
  createdAt: string;
  updatedAt: string;
}

export type Provider = 'openai' | 'anthropic' | 'openrouter' | 'zhipu' | 'ollama' | 'custom';
export type Personality = 'professional' | 'friendly' | 'concise' | 'creative' | 'custom';

export interface CreateAgentInput {
  name: string;
  provider: Provider;
  apiKey: string;
  model?: string;
  personality: Personality;
  customPersonality?: string;
  skills: string[];
  budgetLimit?: number;
}

export interface ChatMessage {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  timestamp: string;
}

export interface UsageSummary {
  agentId?: string;
  period: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  sessionCount: number;
}

export interface UsageRecord {
  id: string;
  agentId: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: string;
}

export interface ContainerStats {
  cpu: number;
  memory: { used: number; limit: number; percent: number };
  network: { rx: number; tx: number };
}

export interface AgentAction {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, any>;
  triggeredBy?: string;
  timestamp: string;
}
