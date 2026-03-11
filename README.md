# Swrm

Deploy AI agents. Control from anywhere.

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Convex account](https://convex.dev) (free tier available)
- [Fly.io account](https://fly.io) (for container hosting)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Setup

```bash
# Clone
git clone https://github.com/xa-x/swrm.git
cd swrm

# Install all workspaces
npm install

# Set up Convex backend
cd packages/backend
npx convex login
npx convex deploy

# Configure native app
cd ../../apps/native
cp .env.example .env
# Edit .env with your Convex URL and Clerk key

# Run the app
npm run start
```

## 📁 Monorepo Structure

```
swrm/
├── apps/
│   ├── native/           # Expo mobile app (@swrm/native)
│   │   ├── app/          # Routes (file-based)
│   │   ├── lib/          # Utilities
│   │   │   ├── db.ts     # Expo-SQLite (offline cache)
│   │   │   ├── storage.ts # Secure storage
│   │   │   └── notifications.ts
│   │   └── components/   # UI components
│   │
│   └── web/              # Next.js web app (@swrm/web)
│       └── app/          # App router (placeholder)
│
├── packages/
│   ├── backend/          # Convex backend (@swrm/backend)
│   │   ├── schema.ts     # Database schema
│   │   ├── agents.ts     # Agent functions
│   │   ├── chat.ts       # Chat functions
│   │   ├── usage.ts      # Usage tracking
│   │   ├── docker.ts     # Fly.io integration
│   │   ├── http.ts       # HTTP actions
│   │   └── crons.ts      # Scheduled jobs
│   │
│   ├── shared/           # Shared types (@swrm/shared)
│   ├── eslint-config/    # Shared ESLint (@swrm/eslint-config)
│   └── typescript-config/ # Shared TS configs (@swrm/typescript-config)
│
├── package.json          # Root (workspaces)
├── .env.example          # Environment template
└── README.md
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  APPS                             │
│  ┌─────────────┐       ┌─────────────┐          │
│  │   Native    │       │     Web     │          │
│  │   (Expo)    │       │  (Next.js)  │          │
│  └──────┬──────┘       └──────┬──────┘          │
└─────────┼──────────────────────┼────────────────┘
          │                      │
          │  Convex Client SDK   │
          └──────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         PACKAGES/BACKEND (Convex)                │
│  - Real-time database                            │
│  - Functions (mutations, queries, actions)       │
│  - Scheduled jobs (crons)                        │
│  - HTTP webhooks                                 │
│  - Built-in dashboard                            │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              FLY.IO MACHINES                     │
│  - ZeroClaw containers (per agent)              │
│  - Auto-scaling                                 │
│  - Multiple regions                             │
│  - $0.50-2/agent/month                          │
└─────────────────────────────────────────────────┘
```

## 🎯 Features

- **Real-time sync** - Convex subscriptions for instant updates
- **Card-based home** - Visual agent grid
- **Markdown chat** - Rich message rendering
- **Swarm mode** - Broadcast to all agents
- **Docker actions** - Start/stop/restart via Fly.io
- **Action logging** - Full audit trail
- **Usage tracking** - Per-agent costs
- **Push notifications** - Task alerts
- **Offline-first** - Local SQLite cache
- **Secure storage** - API keys encrypted
- **Progress indicators** - Real-time status
- **Error recovery** - Retry failed operations

## 📦 Workspaces

| Workspace | Package | Location |
|-----------|---------|----------|
| Native app | `@swrm/native` | `apps/native/` |
| Web app | `@swrm/web` | `apps/web/` |
| Backend | `@swrm/backend` | `packages/backend/` |
| Shared | `@swrm/shared` | `packages/shared/` |
| ESLint | `@swrm/eslint-config` | `packages/eslint-config/` |
| TypeScript | `@swrm/typescript-config` | `packages/typescript-config/` |

## 🔧 Configuration

### Convex Environment Variables
```bash
cd packages/backend
npx convex env set FLY_API_TOKEN <your-token>
npx convex env set FLY_APP_NAME swrm-agents
```

### Native App (.env)
```bash
EXPO_PUBLIC_CONVEX_URL=https://your-name.convex.cloud
EXPO_PUBLIC_CLERK_KEY=pk_test_...
```

## 🚀 Development

```bash
# Run Convex dev (watches for changes)
cd packages/backend && npx convex dev

# Run native app
cd apps/native && npm run start

# Deploy Convex
cd packages/backend && npx convex deploy
```

## 📊 Convex Dashboard

Access at `https://dashboard.convex.dev`:
- **Data**: Browse all tables
- **Functions**: View logs, run manually
- **Crons**: See scheduled jobs
- **Usage**: Monitor function calls
- **Deployments**: View history

## 🚢 Deployment

### Convex
```bash
cd packages/backend
npx convex deploy
```

### Fly.io
```bash
fly apps create swrm-agents
fly tokens create deploy -x 999999h
cd packages/backend
npx convex env set FLY_API_TOKEN <token>
```

### Native App
```bash
cd apps/native
eas build --platform ios
eas submit
```

## 💰 Cost

### Convex
- **Free tier**: 100K function calls/month
- **Pro**: $25/month for 1M calls

### Fly.io Machines
- **Per agent**: $0.50-2/month

### Total
- **MVP (10 agents)**: ~$10-20/month
- **Scale (100 agents)**: ~$50-100/month

## 🔒 Security

| Layer | Protection |
|-------|------------|
| **API keys** | Encrypted at rest |
| **Auth** | Clerk integration |
| **Containers** | Fly.io isolation |
| **Secrets** | Convex env variables |

## 📝 License

MIT

---

Built with ❤️ by [xa-x](https://github.com/xa-x)
