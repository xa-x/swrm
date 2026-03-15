"use node";

/**
 * Container Router (Simplified for MVP)
 * 
 * Uses Docker Engine for local development.
 * Can switch to Fly.io later by adding FLY_API_TOKEN env var.
 */

import { internal } from "./_generated/api";

const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const USE_DOCKER = !FLY_API_TOKEN;

/**
 * Get container API
 */
export function getContainerApi() {
  return USE_DOCKER ? internal.docker : internal.docker; // Always use docker for now
}

/**
 * Export backend type
 */
export const BACKEND_TYPE = USE_DOCKER ? "docker" : "fly";
