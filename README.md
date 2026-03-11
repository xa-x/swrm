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

# Set up Convex
cd packages/backend
npx convex login
npx convex deploy

# Configure environment
cd ../..
cp .env.example .env
# Edit .env with your keys

# Set up Fly.io
fly apps create swrm-agents
fly tokens create deploy -x 999999h
npx convex env set FLY_API_TOKEN <token>

# Run the app
npm run dev:native
```

## 📁 Monorepo Structure

```
swrm/
├── apps/
│   ├── native/           # Expo mobile app
│   │   ├── app/          # Routes (file-based)
│   │   ├── lib/          # Utilities
│   │   └── components/   # UI components
│   │
│   └── web/              # Next.js web app (coming soon)
│       └── app/          # App router
│
├── packages/
│   ├── backend/          # Convex backend
│   │   ├── schema.ts     # Database schema
│   │   ├── agents.ts     # Agent functions
│   │   ├── chat.ts       # Chat functions
│   │   ├── usage.ts      # Usage tracking
│   │   ├── docker.ts     # Fly.io integration
│   │   ├── http.ts       # HTTP actions
│   │   └── crons.ts      # Scheduled jobs
│   │
│   ├── shared/           # Shared types & utilities
│   │   └── src/
│   │       └── index.ts  # Types, providers, regions
│   │
│   ├── eslint-config/    # Shared ESLint config
│   └── typescript-config/ # Shared TS configs
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
          └──────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│         PACKAGES/BACKEND (Convex)                │
│  - Database (real-time sync)                    │
│  - Functions (mutations, queries, actions)      │
│  - Scheduled jobs (crons)                       │
│  - HTTP actions (webhooks)                      │
│  - Built-in dashboard                           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              FLY.IO MACHINES                     │
│  - ZeroClaw containers (per agent)              │
│  - Auto-scaling (start/stop on demand)          │
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
- **Cron jobs** - Automatic cleanup
- **Built-in dashboard** - Convex UI

## 📦 Workspaces

| Workspace | Package Name | Path | Description |
|-----------|--------------|------|-------------|
| Native | `@swrm/native` | `apps/native` | Expo mobile app |
| Web | `@swrm/web` | `apps/web` | Next.js web app |
| Backend | `@swrm/backend` | `packages/backend` | Convex backend |
| Shared | `@swrm/shared` | `packages/shared` | Shared types & utilities |
| ESLint | `@swrm/eslint-config` | `packages/eslint-config` | ESLint configuration |
| TypeScript | `@swrm/typescript-config` | `packages/typescript-config` | TypeScript configs |

### Add dependency to workspace

```bash
# Add to native app
npm install <package> -w @swrm/native

# Add to backend
npm install <package> -w @swrm/backend

# Add to shared package
npm install <package> -w @swrm/shared

# Add dev dependency
npm install -D <package> -w @swrm/native
```

## 🔒 Security

| Layer | Protection |
|-------|------------|
| **API keys** | Encrypted at rest (base64, use proper encryption in prod) |
| **Auth** | Clerk integration |
| **Rate limiting** | Convex built-in limits |
| **Container isolation** | Fly.io Machines (512MB, 1 CPU) |
| **Network** | Internal Fly.io network |
| **Secrets** | Convex environment variables |

## 💰 Cost

### Convex
- **Free tier**: 100K function calls/month
- **Pro**: $25/month for 1M function calls
- **Est. cost**: Free for MVP, ~$25/mo at scale

### Fly.io Machines
- **Shared CPU**: $0.0015/hour (512MB)
- **Est. per agent**: $0.50-2/month (idle most of the time)
- **10 agents**: ~$10-20/month

### Total
- **MVP (10 agents)**: ~$10-20/month
- **Scale (100 agents)**: ~$50-100/month + Convex Pro

## 🚀 Agent Creation Flow

```
User taps [+] → Wizard (4 steps)
  ↓
Convex mutation: agents.create()
  ↓
Action scheduled: docker.createContainer()
  ↓
Fly.io API: POST /machines
  ↓
Machine starts → Agent ready
  ↓
Real-time update: status → "running"
  ↓
Card appears on home grid
```

**Timeline:**
- Machine creation: 5-10 seconds
- From tap to ready: 10-15 seconds total

## 🔧 Configuration

### Convex Environment Variables
```bash
# Set via: npx convex env set KEY value
cd packages/backend
npx convex env set FLY_API_TOKEN <your-token>
npx convex env set FLY_APP_NAME swrm-agents
```

### App Environment (.env)
```bash
EXPO_PUBLIC_CONVEX_URL=https://...
EXPO_PUBLIC_CLERK_KEY=pk_test_...
```

## 📊 Convex Dashboard

Access at `https://dashboard.convex.dev`:
- **Data**: Browse all tables
- **Functions**: View logs, run manually
- **Crons**: See scheduled jobs
- **Usage**: Monitor function calls
- **Deployments**: View history

## 🛠️ Development

```bash
# Run Convex dev (watches for changes)
npm run dev:backend

# Run native app
npm run dev:native

# Run web app
npm run dev:web

# Deploy Convex
npm run deploy

# View logs
cd packages/backend && npx convex logs

# Open dashboard
cd packages/backend && npx convex dashboard
```

## 🚢 Deployment

### Convex (Automatic)
```bash
npm run deploy
```
Convex deploys to their cloud automatically.

### Fly.io (One-time setup)
```bash
fly apps create swrm-agents
fly tokens create deploy -x 999999h  # Long-lived token
cd packages/backend
npx convex env set FLY_API_TOKEN <token>
```

### Native App (EAS)
```bash
cd apps/native
eas build --platform ios
eas submit
```

### Web App (Vercel)
```bash
cd apps/web
vercel deploy
```

## 📝 API Reference

### Convex Functions

**Agents:**
```
agents.list(userId)          → Agent[]
agents.get(agentId)          → Agent
agents.create(...)           → { agentId, status }
agents.update(agentId, ...)  → { success }
agents.remove(agentId)       → { success }
agents.start(agentId)        → { success, status }
agents.stop(agentId)         → { success, status }
agents.restart(agentId)      → { success, status }
```

**Chat:**
```
chat.getHistory(agentId, sessionId?) → Message[]
chat.send(agentId, content, sessionId?) → { response, tokens, cost }
```

**Usage:**
```
usage.getByAgent(agentId, period) → { records, summary }
usage.getByUser(userId, period)   → { agents, totals }
```

## 🔄 Real-time Subscriptions

```typescript
// Subscribe to agent list
const agents = useQuery(api.agents.list, { userId });

// Subscribe to single agent
const agent = useQuery(api.agents.get, { agentId });

// Subscribe to chat history
const messages = useQuery(api.chat.getHistory, { agentId, sessionId });
```

## 📝 License

MIT

---

Built with ❤️ by [xa-x](https://github.com/xa-x)
