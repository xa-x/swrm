# Swrm 🐝

Deploy AI agents. Control from anywhere. High-performance, local-first agent management.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) (recommended) or Node.js 18+
- [Convex account](https://convex.dev)
- [Clerk account](https://clerk.com)
- [Fly.io account](https://fly.io) or Docker Desktop (for agent hosting)

### Setup

```bash
# Clone
git clone https://github.com/xa-x/swrm.git
cd swrm

# Install dependencies
bun install

# Set up Convex backend
npx convex dev

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Convex URL and Clerk keys

# Run the app (Expo)
bun run start
```

## 🏗️ Architecture

Swrm follows a **Hybrid Sync** architecture for maximum responsiveness and reliability:

- **Source of Truth (Cloud)**: [Convex](https://convex.dev) handles real-time database state, server-side functions, and agent orchestration.
- **Local-First (Mobile)**: [Expo](https://expo.dev) + [SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) ensures the app remains functional and snappy even with poor connectivity.
- **Reactive Sync**: The mobile app subscribes to Convex queries and automatically syncs changes to the local SQLite cache.
- **Agent Hosting**: Agents run in isolated containers on [Fly.io](https://fly.io) (Production) or [Docker](https://docker.com) (Development).

## 📁 Repository Structure

```
swrm/
├── app/                  # Expo Router (Tabs, Auth, Screens)
├── convex/               # Convex Backend (Schema, Mutations, Actions)
├── components/           # Reusable UI Components (Uniwind + Reanimated)
├── lib/                  # Core Utilities & Hooks
│   ├── db.ts            # Local SQLite (Offline Cache)
│   ├── hooks.ts         # Custom Hooks
│   └── containers.ts    # Container Orchestration Logic
├── providers/           # Context Providers (Auth, Convex)
├── assets/              # Static Assets (Images, Fonts)
└── package.json         # Unified dependency management
```

## 🎯 Key Features

- **Real-time Sync** - Instant updates via Convex subscriptions.
- **Local-First Cache** - SQLite integration for offline persistence.
- **AI Orchestration** - Deploy and manage agents via Fly.io or Docker.
- **Modern UI** - Styled with **Uniwind** (Tailwind for Native) and **Reanimated**.
- **Secure Auth** - Integrated with **Clerk** for seamless, secure user management.
- **Action Logging** - Full audit trail for every agent interaction.
- **Push Notifications** - Stay updated on agent tasks and status.

## 🔧 Configuration

### Environment Variables (.env.local)
```bash
EXPO_PUBLIC_CONVEX_URL=https://your-name.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_... # For backend actions if needed
```

### Convex Setup
Ensure your Convex project is linked:
```bash
npx convex dev
```

## 🚢 Deployment

### Production Backend
```bash
npx convex deploy
```

### Mobile App (EAS)
```bash
eas build --platform ios
# or
eas build --platform android
```

## 💰 Resource Usage

- **Convex**: Free tier supports up to 100K function calls/month.
- **Fly.io**: Agents cost approx. $0.50 - $2.00/month depending on usage and instance size.

## 🔒 Security

- **End-to-End Auth**: Clerk + Convex OIDC integration.
- **Isolation**: Each agent runs in its own secure container.
- **Encrypted Keys**: API keys are handled securely within the Convex environment.

## 📝 License

MIT

---
Built with ❤️ by [xa-x](https://github.com/xa-x)
