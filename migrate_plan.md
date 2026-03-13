# Migration Plan: Single Repo Expo & Convex

This plan outlines the steps to consolidate the **Swrm** monorepo into a simplified "Single Repo" structure using **Expo**, **Convex**, **Clerk**, and **Uniwind**.

## Goal
- **Simplicity**: Reduce monorepo overhead.
- **Speed**: Faster builds and unified development environment.
- **Realtime**: Seamless Convex integration.
- **Modern UI**: Fully utilize Uniwind (Tailwind) for styling.

## Proposed Architecture
Moving from `apps/` and `packages/` to a single project structure centered in `apps/native` (which will likely be renamed to `app` or similar, or just merged into the root).

## Proposed Changes

### 1. Consolidation
- **Move Convex**: Move `packages/backend/convex` to `apps/native/convex`.
- **Merge Logic**: Move any logic from `packages/shared` into `apps/native/lib` or `apps/native/convex`.
- **Cleanup**: Remove `packages/backend`, `packages/shared`, and root workspace config if flattening.

### 2. Authentication & Realtime
- **Clerk Integration**: Use `ConvexProviderWithClerk` in `_layout.tsx`.
- **Types**: Ensure generated types are correctly imported from the local `./convex/_generated/api`.

### 3. Styling (Uniwind)
- **Simplify**: Use `uniwind` for all component styling to maintain a consistent, fast-to-develop UI.
- **Theming**: Keep theme variables in `global.css` but use them via Tailwind classes.

### 4. Build Optimization
- **Bun**: Continue using Bun for fast installations and script execution.
- **Environment**: Unified `.env.local` for both Expo and Convex.

## Step-by-Step Task List

1. [ ] Move `convex/` folder to `apps/native/`.
2. [ ] Update `apps/native/package.json` with backend dependencies.
3. [ ] Update root `package.json` to simplify scripts.
4. [ ] Refactor imports in `apps/native` from `@swrm/backend/*` to local `./convex/*`.
5. [ ] Config `ConvexProviderWithClerk` in `apps/native/app/_layout.tsx`.
6. [ ] Remove `packages/` and `apps/web/`.
7. [ ] Verify build and auth flow.
