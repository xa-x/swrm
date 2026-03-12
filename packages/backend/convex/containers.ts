/**
 * Unified Container Management Router
 * 
 * Routes container operations to:
 * - Docker Engine (development)
 * - Fly.io Machines (production)
 * 
 * Environment controlled by NODE_ENV:
 * - "development" or undefined → Docker
 * - "production" → Fly.io
 * 
 * USAGE:
 * Instead of calling internal.docker or internal.fly directly,
 * use the getContainerApi() helper to get the correct API reference.
 */

import { internal } from "./_generated/api";

// Environment detection
const USE_DOCKER = process.env.NODE_ENV !== "production";

/**
 * Log which backend is active
 */
if (typeof console !== "undefined") {
  console.log(`📦 Container backend: ${USE_DOCKER ? "Docker Engine (dev)" : "Fly.io (prod)"}`);
}

/**
 * Get the correct container API based on environment
 * 
 * @returns The internal API namespace for Docker or Fly
 * 
 * @example
 * const containerApi = getContainerApi();
 * await ctx.scheduler.runAfter(0, containerApi.createContainer, { ... });
 */
export function getContainerApi() {
  return USE_DOCKER ? internal.docker : internal.fly;
}

/**
 * Get container reference field name based on environment
 * - Docker: containerId
 * - Fly: flyMachineId
 */
export function getContainerIdField(): "containerId" | "flyMachineId" {
  return USE_DOCKER ? "containerId" : "flyMachineId";
}

/**
 * Export backend type for logging/debugging
 */
export const BACKEND_TYPE = USE_DOCKER ? "docker" : "fly";

/**
 * Export environment flag
 */
export const USE_DOCKER_BACKEND = USE_DOCKER;
