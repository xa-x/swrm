# Swrm

Deploy AI agents. Control from anywhere.

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Convex account](https://convex.dev)
- [Fly.io account](https://fly.io)
- [Expo CLI](https://docs.expo.dev)

### Setup

```bash
# Clone
git clone https://github.com/xa-x/swrm.git
cd swrm

# Install dependencies (all workspaces)
npm install

# Set up Convex
npx convex login
npx convex deploy

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Set up Fly.io
fly apps create swrm-agents
fly tokens create deploy -x 999999h
npx convex env set FLY_API_TOKEN <token>

# Run native app
npm run dev:native

# Or run web app (when ready)
npm run dev:web
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
│   ├── shared/           # Shared types & utilities
│   ├── eslint-config/    # ESLint config
│   └── typescript-config/ # TypeScript configs
│
├── convex/               # Convex backend
│   ├── schema.ts         # Database schema
│   ├── agents.ts         # Agent functions
│   ├── chat.ts           # Chat functions
│   ├── usage.ts          # Usage tracking
│   ├── docker.ts         # Fly.io integration
│   ├── http.ts           # HTTP actions
│   └── crons.ts          # Scheduled jobs
│
└── backend/              # Bun fallback (optional)
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
│              CONVEX (Backend)                     │
│  - Real-time database                            │
│  - Functions (mutations, queries, actions)       │
│  - Scheduled jobs                                │
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

- **Real-time sync** - Convex subscriptions
- **Card-based home** - Visual agent grid
- **Markdown chat** - Rich messages
- **Swarm mode** - Broadcast to all agents
- **Docker actions** - Start/stop/restart
- **Usage tracking** - Per-agent costs
- **Push notifications** - Task alerts
- **Offline-first** - Local cache
- **Secure storage** - Encrypted API keys

## 🛠️ Development

```bash
# Run Convex dev (watches for changes)
npm run dev:convex

# Run native app
npm run dev:native

# Run web app
npm run dev:web

# Build shared package
npm run build

# Deploy Convex
npm run deploy

# Clean all dependencies
npm run clean
```

## 📦 Workspaces

This is a monorepo using npm workspaces:

| Workspace | Path | Description |
|-----------|------|-------------|
| `@swrm/native` | `apps/native` | Expo mobile app |
| `@swrm/web` | `apps/web` | Next.js web app |
| `@swrm/shared` | `packages/shared` | Shared types & utilities |
| `@swrm/eslint-config` | `packages/eslint-config` | ESLint configuration |
| `@swrm/typescript-config` | `packages/typescript-config` | TypeScript configs |

### Add dependency to workspace

```bash
# Add to native app
npm install <package> -w @swrm/native

# Add to shared package
npm install <package> -w @swrm/shared

# Add dev dependency
npm install -D <package> -w @swrm/native
```

## 🚢 Deployment

### Convex
```bash
npx convex deploy
```

### Fly.io
```bash
fly apps create swrm-agents
fly tokens create deploy -x 999999h
npx convex env set FLY_API_TOKEN <token>
```

### Native App
```bash
cd apps/native
eas build --platform ios
eas submit
```

### Web App
```bash
cd apps/web
vercel deploy
```

## 💰 Cost

### Convex
- **Free tier**: 100K function calls/month
- **Pro**: $25/month for 1M calls
- **Est**: Free for MVP, ~$25/mo at scale

### Fly.io Machines
- **Shared CPU**: $0.0015/hour (512MB)
- **Est per agent**: $0.50-2/month
- **10 agents**: ~$10-20/month

### Total
- **MVP**: ~$10-20/month
- **Scale**: ~$50-100/month

## 📊 Convex Dashboard

Access at https://dashboard.convex.dev:
- Data browser
- Function logs
- Usage metrics
- Scheduled crons
- Deploy history

## 🔒 Security

| Layer | Protection |
|-------|------------|
| **API keys** | Encrypted at rest |
| **Auth** | Clerk integration |
| **Rate limiting** | Convex built-in |
| **Containers** | Fly.io isolation |
| **Secrets** | Convex env variables |

## 📝 License

MIT

---

Built with ❤️ by [xa-x](https://github.com/xa-x)
