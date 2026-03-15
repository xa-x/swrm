import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// Simple hook to get agents for a user
export function useAgents(userId: string | null) {
  const agents = useQuery(
    api.agents.list,
    userId ? {} : "skip"
  );
  
  return agents ?? [];
}

// Hook to get single agent
export function useAgent(agentId: string | null) {
  const agent = useQuery(
    api.agents.get,
    agentId ? { agentId: agentId as any } : "skip"
  );
  
  return agent;
}

// Hook to get user data
export function useUser() {
  const user = useQuery(api.users.getUser);
  return user;
}
