# Fly.io Deployment Guide

## Architecture Overview

```
User App (Expo)
    ↓ (Convex mutation)
Convex Backend
    ↓ (Fly.io API)
Fly.io Machine
    └── ZeroClaw Container
        └── User's Agent (configured via env vars)
```

## How Configuration Flows

### 1. User Creates Agent in App

```typescript
// apps/native/app/(app)/create.tsx
const createAgent = useCreateAgent();

await createAgent({
  userId: "user_abc123",
  name: "Nova",
  provider: "openai",
  apiKey: "sk-proj-...",  // User's API key
  model: "gpt-4o",
  personality: "friendly",
  skills: ["code", "web", "files"],
  region: "us-east",
});
```

### 2. Convex Stores & Schedules Container Creation

```typescript
// packages/backend/convex/agents.ts
export const create = mutation({
  handler: async (ctx, args) => {
    // 1. Create agent record
    const agentId = await ctx.db.insert("agents", {
      ...args,
      status: "creating",
    });

    // 2. Schedule container creation (async)
    await ctx.scheduler.runAfter(0, internal.fly.createContainer, {
      agentId,
      userId: args.userId,
      name: args.name,
      provider: args.provider,
      apiKey: args.apiKey,  // Will be passed as env var
      model: args.model,
      personality: args.personality,
      skills: args.skills,
      region: args.region,
    });

    return { agentId, status: "creating" };
  },
});
```

### 3. Fly Action Creates Machine with Config

```typescript
// packages/backend/convex/fly.ts
export const createContainer = action({
  handler: async (ctx, args) => {
    // Build env vars for ZeroClaw
    const env = {
      ZEROCLAW_API_KEY: args.apiKey,
      ZEROCLAW_PROVIDER: args.provider,
      ZEROCLAW_MODEL: args.model,
      AGENT_NAME: args.name,
      AGENT_PERSONALITY: args.personality,
      AGENT_SKILLS: args.skills.join(","),
    };

    // Create Fly.io Machine
    const response = await fetch(
      `https://api.machines.dev/v1/apps/swrm-agents/machines`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FLY_API_TOKEN}`,
        },
        body: JSON.stringify({
          name: `swrm-${agentId}`,
          region: "iad",
          config: {
            image: "ghcr.io/zeroclaw-labs/zeroclaw:latest",
            env,
            metadata: {
              agent_id: agentId,
              user_id: userId,
            },
          },
        }),
      }
    );

    const machine = await response.json();
    
    // Update agent with machine ID
    await ctx.runMutation(internal.agents.updateStatus, {
      agentId,
      status: "running",
      flyMachineId: machine.id,
    });

    return { machineId: machine.id };
  },
});
```

### 4. ZeroClaw Container Starts with Config

ZeroClaw reads environment variables and configures itself:

```bash
# Inside the container
ZEROCLAW_API_KEY=sk-proj-...
ZEROCLAW_PROVIDER=openai
ZEROCLAW_MODEL=gpt-4o
AGENT_NAME=Nova
AGENT_PERSONALITY=You are a friendly assistant...
AGENT_SKILLS=code,web,files
```

ZeroClaw generates `~/.zeroclaw/config.toml` from these env vars.

---

## Deployment Steps

### Step 1: Create Fly.io App

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app for containers
fly apps create swrm-agents

# Create app for Convex backend (optional, if hosting Convex on Fly)
fly apps create swrm-api
```

### Step 2: Configure Fly.io Secrets

```bash
# Set environment variables in Convex
cd packages/backend

# Generate Fly.io API token
fly auth token

# Set in Convex
npx convex env set FLY_API_TOKEN <your-token>
npx convex env set FLY_APP_NAME swrm-agents
```

### Step 3: Deploy ZeroClaw Image

```bash
# Option A: Use pre-built image
docker pull ghcr.io/zeroclaw-labs/zeroclaw:latest

# Option B: Build custom image with your modifications
git clone https://github.com/zeroclaw-labs/zeroclaw
cd zeroclaw
docker build -t your-registry/zeroclaw:latest .
docker push your-registry/zeroclaw:latest
```

### Step 4: Test Manual Machine Creation

```bash
# Create a test machine manually
fly machines run \
  ghcr.io/zeroclaw-labs/zeroclaw:latest \
  --app swrm-agents \
  --region iad \
  --env ZEROCLAW_API_KEY=sk-test \
  --env ZEROCLAW_PROVIDER=openai \
  --env AGENT_NAME=TestAgent
```

### Step 5: Verify Machine Communication

```bash
# List machines
fly machines list --app swrm-agents

# Get machine details
fly machines status <machine-id> --app swrm-agents

# Check logs
fly logs --app swrm-agents
```

---

## Configuration Options

### ZeroClaw Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZEROCLAW_API_KEY` | ✅ | LLM provider API key |
| `ZEROCLAW_PROVIDER` | ✅ | openai, anthropic, openrouter, zhipu, ollama |
| `ZEROCLAW_MODEL` | ❌ | Model to use (default: provider default) |
| `ZEROCLAW_GATEWAY_PORT` | ❌ | HTTP port (default: 42617) |
| `ZEROCLAW_MEMORY_BACKEND` | ❌ | sqlite, postgres, redis |
| `ZEROCLAW_AUTONOMY_LEVEL` | ❌ | supervised, autonomous |
| `ZEROCLAW_WORKSPACE_ONLY` | ❌ | Restrict to workspace dir |

### Custom Agent Variables

| Variable | Description |
|----------|-------------|
| `AGENT_NAME` | Agent's name |
| `AGENT_PERSONALITY` | Personality prompt |
| `AGENT_SKILLS` | Comma-separated skill list |
| `AGENT_CUSTOM_PERSONALITY` | Custom personality text |

---

## Cost Estimation

### Fly.io Machines Pricing

| Resource | Cost |
|----------|------|
| Shared CPU (1 CPU) | $0.0015/hour |
| Memory (512MB) | Included |
| Storage (1GB) | $0.15/month |
| Network (egress) | Free up to 100GB/month |

### Per-Agent Monthly Cost

| Usage Pattern | Est. Cost/Month |
|---------------|-----------------|
| Idle (stopped) | $0 |
| Light (1hr/day) | $0.50 |
| Medium (4hrs/day) | $1.80 |
| Heavy (8hrs/day) | $3.60 |
| Always-on | $10.80 |

**With auto-stop after inactivity:** ~$0.50-2/agent/month

---

## Security Best Practices

### 1. Encrypt API Keys

```typescript
// packages/backend/convex/fly.ts
import { encrypt } from "../services/crypto";

const encryptedKey = await encrypt(args.apiKey);

// In env var
env.ZEROCLAW_API_KEY = encryptedKey;
```

### 2. Use Fly.io Secrets for Platform Keys

```bash
# Never commit these
fly secrets set FLY_API_TOKEN=<token> --app swrm-api
```

### 3. Network Isolation

```typescript
// Machines only accessible via internal network
const internalUrl = `http://${machineId}.vm.swrm-agents.internal:42617`;
```

### 4. Resource Limits

```typescript
config: {
  guest: {
    cpu_kind: "shared",
    cpus: 1,
    memory_mb: 512, // Limit memory
  },
  restart: {
    policy: "on-failure",
    max_retries: 3,
  },
}
```

---

## Monitoring & Debugging

### View Machine Logs

```bash
# All machines
fly logs --app swrm-agents

# Specific machine
fly logs --app swrm-agents --machine <machine-id>
```

### Check Machine Status

```bash
fly machines status <machine-id> --app swrm-agents
```

### SSH into Machine

```bash
fly ssh console --app swrm-agents --machine <machine-id>
```

---

## Troubleshooting

### Machine Won't Start

1. Check logs: `fly logs --app swrm-agents`
2. Verify image exists: `docker pull ghcr.io/zeroclaw-labs/zeroclaw:latest`
3. Check env vars are set correctly

### Agent Not Responding

1. Check machine is running: `fly machines list`
2. Verify internal DNS: `curl http://<machine-id>.vm.swrm-agents.internal:42617/health`
3. Check ZeroClaw logs

### API Key Issues

1. Verify key is valid
2. Check provider is correct
3. Ensure encryption/decryption works

---

## Next Steps

1. Set up Fly.io app: `fly apps create swrm-agents`
2. Configure Convex env vars
3. Test manual machine creation
4. Deploy and test from app
