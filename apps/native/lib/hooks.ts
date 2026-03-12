import { useQuery, useMutation } from "convex/react";
import type { Doc, Id } from "@swrm/backend/convex/_generated/dataModel";
import type { FunctionArgs, FunctionReturnType } from "convex/browser";
import type { AnyFunction } from "convex/server";

// Dynamic import to handle missing generated files
const api = {
  agents: {
    list: "agents:list" as const,
    get: "agents:get" as const,
    getStatus: "agents:getStatus" as const,
    getActions: "agents:getActions" as const,
    create: "agents:create" as const,
    update: "agents:update" as const,
    remove: "agents:remove" as const,
    start: "agents:start" as const,
    stop: "agents:stop" as const,
    restart: "agents:restart" as const,
  },
  chat: {
    getHistory: "chat:getHistory" as const,
    send: "chat:send" as const,
  },
  usage: {
    getByAgent: "usage:getByAgent" as const,
    getByUser: "usage:getByUser" as const,
  },
};

// ============ AGENTS ============

// Get all agents (real-time subscription)
export function useAgents(userId: string | null) {
  return useQuery(
    userId ? api.agents.list : "skip",
    userId ? { userId } : undefined
  );
}

// Get single agent (real-time subscription)
export function useAgent(agentId: Id<"agents"> | null) {
  return useQuery(
    agentId ? api.agents.get : "skip",
    agentId ? { agentId } : undefined
  );
}

// Get agent status
export function useAgentStatus(agentId: Id<"agents"> | null) {
  return useQuery(
    agentId ? api.agents.getStatus : "skip",
    agentId ? { agentId } : undefined
  );
}

// Get agent actions (audit log)
export function useAgentActions(
  agentId: Id<"agents"> | null,
  limit?: number
) {
  return useQuery(
    agentId ? api.agents.getActions : "skip",
    agentId ? { agentId, limit } : undefined
  );
}

// Create agent mutation
export function useCreateAgent() {
  return useMutation(api.agents.create);
}

// Update agent mutation
export function useUpdateAgent() {
  return useMutation(api.agents.update);
}

// Delete agent mutation
export function useDeleteAgent() {
  return useMutation(api.agents.remove);
}

// Start agent mutation
export function useStartAgent() {
  return useMutation(api.agents.start);
}

// Stop agent mutation
export function useStopAgent() {
  return useMutation(api.agents.stop);
}

// Restart agent mutation
export function useRestartAgent() {
  return useMutation(api.agents.restart);
}

// ============ CHAT ============

// Get chat history (real-time subscription)
export function useChatHistory(
  agentId: Id<"agents"> | null,
  sessionId?: string,
  limit?: number
) {
  return useQuery(
    agentId ? api.chat.getHistory : "skip",
    agentId ? { agentId, sessionId, limit } : undefined
  );
}

// Send message mutation
export function useSendMessage() {
  return useMutation(api.chat.send);
}

// ============ USAGE ============

// Get usage for agent
export function useUsageByAgent(
  agentId: Id<"agents"> | null,
  period?: "day" | "week" | "month"
) {
  return useQuery(
    agentId ? api.usage.getByAgent : "skip",
    agentId ? { agentId, period } : undefined
  );
}

// Get usage for user
export function useUsageByUser(
  userId: string | null,
  period?: "day" | "week" | "month"
) {
  return useQuery(
    userId ? api.usage.getByUser : "skip",
    userId ? { userId, period } : undefined
  );
}

// ============ TYPES ============

export type { Doc, Id };
export type Agent = Doc<"agents">;
export type Message = Doc<"messages">;
export type Session = Doc<"sessions">;
export type Action = Doc<"actions">;
export type Usage = Doc<"usage">;
export type PushToken = Doc<"pushTokens">;
