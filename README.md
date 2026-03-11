# Swrm

Deploy AI agents. Control from anywhere.

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [Docker Desktop](https://docs.docker.com/get-docker/) - Container runtime
- [Expo CLI](https://docs.expo.dev/get-started/installation/) - React Native

### One-Command Setup

```bash
chmod +x setup.sh start.sh
./setup.sh
```

### Manual Setup

**Backend:**
```bash
cd backend
bun install

# Generate encryption key
openssl rand -hex 32 >> .env
# Edit .env and set ENCRYPTION_KEY=...

bun run dev
```

**App:**
```bash
cd app
npm install
npx expo start
```

## 🎯 Features

- **Card-based home** - Visual agent grid
- **Markdown chat** - Rich message rendering
- **Swarm mode** - Broadcast to all agents
- **Docker actions** - Start/stop/restart/kill
- **Action logging** - Track all container events
- **Usage tracking** - Per-agent costs
- **Push notifications** - Task alerts
- **Offline-first** - Local SQLite cache
- **Secure storage** - API keys encrypted at rest
- **Progress indicators** - Real-time creation status
- **Error recovery** - Retry failed operations

## 🔒 Security

### API Key Storage
- Keys are **encrypted at rest** using AES-256-GCM
- Keys are **never sent to backend** after initial creation
- Keys stored in device **SecureStore** (encrypted on disk)

### Backend Security
| Layer | Protection |
|-------|------------|
| **Encryption** | AES-256-GCM for API keys |
| **Rate limiting** | 100 req/min per IP |
| **Security headers** | CSP, XSS, CSRF protection |
| **Input validation** | Zod schemas on all endpoints |
| **Auth** | X-User-Id header (JWT in production) |
| **Docker** | Containers isolated, limited resources |

### Container Isolation
```yaml
Memory: 512MB limit
CPU: 0.5 cores
Network: Isolated per region
Filesystem: Read-only root + workspace volume
```

### Privacy

**We track:**
- ✅ Token usage (for billing)
- ✅ Agent status
- ✅ Container actions
- ✅ Session count

**We DON'T track:**
- ❌ Chat messages
- ❌ File contents
- ❌ Voice recordings
- ❌ API keys (only encrypted hash)

Messages stay in user's app and agent container.

## 📁 Project Structure

```
swrm/
├── app/                    # Expo app
│   ├── app/               # Routes (file-based)
│   │   ├── (app)/
│   │   │   ├── index.tsx  # Home (agent cards)
│   │   │   ├── chat/[id].tsx
│   │   │   ├── create.tsx
│   │   │   ├── broadcast.tsx
│   │   │   ├── agent/[id].tsx
│   │   │   └── settings.tsx
│   │   ├── (auth)/
│   │   └── (setup)/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── db.ts
│   │   ├── storage.ts
│   │   ├── websocket.ts
│   │   └── notifications.ts
│   └── components/
│       ├── ProgressIndicator.tsx
│       └── ErrorRecovery.tsx
│
└── backend/               # Bun + Hono API
    ├── src/
    │   ├── index.ts
    │   ├── routes/
    │   ├── services/
    │   │   ├── docker.ts
    │   │   └── crypto.ts
    │   ├── middleware/
    │   │   └── security.ts
    │   └── db/
    └── fly.toml
```

## 🐳 Docker Actions

Every action is logged:

```
POST /agents/:id/start     // Start agent
POST /agents/:id/stop      // Graceful stop
POST /agents/:id/pause     // Pause (idle mode)
POST /agents/:id/restart   // Force restart
POST /agents/:id/kill      // Hard kill
GET  /agents/:id/logs      // Container logs
GET  /agents/:id/stats     // CPU/memory usage
GET  /agents/:id/actions   // Action history
```

## 🚀 Agent Creation Flow

```
User taps [+] → Wizard (4 steps)
  ├─ Step 1: Name
  ├─ Step 2: Provider + API Key
  ├─ Step 3: Personality
  └─ Step 4: Skills
      ↓
POST /agents (API key encrypted)
      ↓
[Creating] → Pull ZeroClaw image → Create container → [Running]
      ↓
Progress indicator shows:
  🔨 Creating... (20%)
  📥 Pulling image... (40%)
  🚀 Starting... (60-90%)
  ✅ Ready! (100%)
      ↓
Card appears on home grid
      ↓
Tap → Chat
```

**Timeline:**
- First time: 15-40 seconds (image pull)
- Subsequent: 5-10 seconds

## 🔧 Configuration

### App (.env)
```bash
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_CLERK_KEY=pk_test_...
```

### Backend (.env)
```bash
PORT=3001
NODE_ENV=development

# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your_32_byte_hex_key_here
```

## 🚢 Deployment

### Backend → Fly.io

```bash
cd backend

# First time
fly launch

# Set secrets
fly secrets set ENCRYPTION_KEY=$(openssl rand -hex 32)

# Deploy
fly deploy
```

**Cost:** ~$2/month per region

### App → EAS

```bash
cd app

# Build
eas build --platform ios --profile development

# Submit
eas submit --platform ios
```

## 📊 API Reference

### Agents
```
GET    /agents              # List user's agents
POST   /agents              # Create agent
GET    /agents/:id          # Get agent
PATCH  /agents/:id          # Update agent
DELETE /agents/:id          # Delete agent

POST   /agents/:id/start    # Start container
POST   /agents/:id/stop     # Stop container
POST   /agents/:id/pause    # Pause container
POST   /agents/:id/restart  # Restart container
POST   /agents/:id/kill     # Kill container

GET    /agents/:id/logs     # Container logs
GET    /agents/:id/stats    # Resource stats
GET    /agents/:id/actions  # Action history
```

### Chat
```
GET    /chat/ws/:agentId    # WebSocket connection
POST   /chat/:agentId       # REST message
```

### Usage
```
GET    /usage/:agentId      # Agent usage
GET    /usage               # All usage
```

## 💰 BYOK Model

Users bring their own API keys:
- Zero AI cost to you
- Transparent pricing
- User has full control

**Future:** Add credit system for non-tech users.

## 🛠 Development

```bash
# Run backend in dev mode
cd backend && bun run dev

# Run app
cd app && npx expo start

# Type check
cd backend && bun run typecheck
```

## 📝 License

MIT
