import { useQuery, useMutation } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";



// ============ AGENTS ============

export function useAuthTest() {
  return useQuery(api.agents.authTest);
}

// Get all agents (real-time subscription)
export function useAgents(userId: string | null) {
  return useQuery(api.agents.list, userId ? { userId } : "skip");
}

// Get single agent (real-time subscription)
export function useAgent(agentId: Id<"agents"> | null) {
  return useQuery(api.agents.get, agentId ? { agentId } : "skip");
}

// Get agent status
export function useAgentStatus(agentId: Id<"agents"> | null) {
  return useQuery(api.agents.getStatus, agentId ? { agentId } : "skip");
}

// Get agent actions (audit log)
export function useAgentActions(
  agentId: Id<"agents"> | null,
  limit?: number
) {
  return useQuery(api.agents.getActions, agentId ? { agentId, limit } : "skip");
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
  return useQuery(api.chat.getHistory, agentId ? { agentId, sessionId, limit } : "skip");
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
  return useQuery(api.usage.getByAgent, agentId ? { agentId, period } : "skip");
}

// Get usage for user
export function useUsageByUser(
  userId: string | null,
  period?: "day" | "week" | "month"
) {
  return useQuery(api.usage.getByUser, userId ? { userId, period } : "skip");
}

// ============ TYPES ============

export type { Doc, Id };
export type Agent = Doc<"agents">;
export type Message = Doc<"messages">;
export type Session = Doc<"sessions">;
export type Action = Doc<"actions">;
export type Usage = Doc<"usage">;
export type PushToken = Doc<"pushTokens">;
