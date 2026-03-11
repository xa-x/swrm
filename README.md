# Swrm

Deploy AI agents. Control from anywhere.

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Convex account](https://convex.dev) (free tier available)
- [Fly.io account](https://fly.io) (for container hosting)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Setup

**1. Clone and install**
```bash
git clone https://github.com/your-org/swrm.git
cd swrm
npm install
```

**2. Set up Convex**
```bash
# Install Convex CLI
npm install -g convex

# Login to Convex
npx convex login

# Deploy to Convex (creates backend automatically)
npx convex deploy
```

**3. Configure environment**
```bash
# Copy example env
cp .env.example .env

# Add your keys
CONVEX_URL=your_convex_url
FLY_API_TOKEN=your_fly_token
FLY_APP_NAME=swrm-agents
```

**4. Set up Fly.io**
```bash
# Create Fly.io app for containers
fly apps create swrm-agents

# Generate API token
fly auth token

# Add token to Convex environment variables
npx convex env set FLY_API_TOKEN your_token_here
```

**5. Run the app**
```bash
# Start Expo
cd app
npx expo start
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  EXPO APP                        │
│  - Real-time subscriptions (Convex)             │
│  - Offline-first (Expo-SQLite)                  │
│  - Push notifications                           │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│                  CONVEX                          │
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

## 📁 Project Structure

```
swrm/
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── agents.ts           # Agent CRUD
│   ├── chat.ts             # Chat functions
│   ├── usage.ts            # Usage tracking
│   ├── docker.ts           # Fly.io integration
│   ├── http.ts             # HTTP actions
│   ├── crons.ts            # Scheduled jobs
│   └── actions.ts          # Action logging
│
├── app/                    # Expo app
│   ├── app/               # Routes
│   │   ├── (app)/
│   │   ├── (auth)/
│   │   └── (setup)/
│   ├── lib/
│   │   ├── convex.ts      # Convex client
│   │   ├── api.ts         # API wrapper
│   │   └── storage.ts
│   └── components/
│
└── README.md
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

## 🐳 Container Management

Every agent runs in a Fly.io Machine:

```
Agent created → Machine spawned (ZeroClaw image)
User sends message → Machine wakes (if stopped)
Message processed → Machine can idle/stop
User stops agent → Machine destroyed
```

**Actions logged:**
- create, start, stop, restart, delete
- Timestamp, triggered by, details

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
FLY_API_TOKEN=your_fly_token
FLY_APP_NAME=swrm-agents
```

### App Environment (.env)
```bash
EXPO_PUBLIC_CONVEX_URL=your_convex_url
EXPO_PUBLIC_CLERK_KEY=pk_test_...
```

## 📊 Convex Dashboard

Access at `https://dashboard.convex.dev`:
- **Data**: Browse all tables
- **Functions**: View logs, run manually
- **Crons**: See scheduled jobs
- **Usage**: Monitor function calls
- **Deployments**: View history

## 🛠 Development

```bash
# Run Convex dev (watches for changes)
npx convex dev

# Run Expo
cd app && npx expo start

# Deploy Convex
npx convex deploy

# View logs
npx convex logs
```

## 🚢 Deployment

### Convex (Automatic)
```bash
npx convex deploy
```
Convex deploys to their cloud automatically.

### Fly.io (One-time setup)
```bash
fly apps create swrm-agents
fly tokens create deploy -x 999999h  # Long-lived token
npx convex env set FLY_API_TOKEN <token>
```

### App (EAS)
```bash
cd app
eas build --platform ios
eas submit
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
