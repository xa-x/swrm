# Swrm Build Plan

## Project Overview
Swrm is a monorepo application designed for managing AI agents with a local-first mobile experience and a robust cloud-synced backend.

### Architecture
- **Monorepo**: Managed with Bun workspaces.
- **Backend (`packages/backend`)**: Convex backend handling agent orchestration, deployments (Docker/Fly), and state.
- **Native App (`apps/native`)**: Expo-based React Native application.
- **Shared Library (`packages/shared`)**: Shared types and constants used across backend and frontend.

## Authentication Flow (Clerk)
Currently, authentication is handled via **Clerk**.

### Backend Integration
- The backend is configured as a Clerk OIDC provider in `convex/auth.config.ts`.
- Security is enforced in Convex functions (`agents.ts`) by validating the `ctx.auth.getUserIdentity()`.
- User identity is tied to the `subject` field from the Clerk JWT.

### Mobile Integration
- The app uses `@clerk/expo` for authentication UI and state management.
- Local redirects are handled in `app/index.tsx` based on `isSignedIn` status.
- **Current Observation**: The connection between Clerk and Convex in the native app needs to be verified/strengthened. The `ConvexProvider` in `_layout.tsx` should ideally be wrapped with `ConvexProviderWithClerk` to ensure all Convex calls are properly signed with the Clerk JWT.

## Data Sync Strategy
The application employs a **Hybrid Sync** strategy:
1. **Local Persistent Storage**: SQLite (`expo-sqlite`) serves as the primary local cache on the mobile device.
2. **Cloud Source of Truth**: Convex holds the authoritative state for agents and cross-device data.
3. **Reactive Sync**: The native app subscribes to Convex queries (e.g., `useAgents`) and automatically upserts changes into the local SQLite database (`lib/db.ts`).

## Development Roadmap
1. **[ ] Auth Bridge**: Update `RootLayout` in `apps/native/app/_layout.tsx` to use `ConvexProviderWithClerk`.
2. **[ ] Agent Deployment**: Ensure Docker/Fly container orchestration is fully functional in `packages/backend/convex/containers.ts`.
3. **[ ] Encryption**: Replace Base64 "encryption" in `agents.ts` with proper KMS or Convex secrets for API keys.
4. **[ ] Offline Support**: Enhancing the local-first capabilities by allowing mutations to queue while offline and sync back to Convex.

## Environment Setup
- **Native**: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_CONVEX_URL` are required in `.env.local`.
- **Backend**: `CLERK_JWT_ISSUER_DOMAIN` must be configured in the Convex dashboard.
