# Fly Machines API — Swrm Reference

**Base URL:** `https://api.machines.dev`
**Auth:** `Authorization: Bearer ${FLY_API_TOKEN}`
**App Name:** `swrm` (or whatever you create)

---

## Endpoints Used by Swrm

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/apps/{app_name}/machines` | POST | Create agent |
| `/v1/apps/{app_name}/machines` | GET | List agents |
| `/v1/apps/{app_name}/machines/{machine_id}` | GET | Get agent status |
| `/v1/apps/{app_name}/machines/{machine_id}/start` | POST | Start agent |
| `/v1/apps/{app_name}/machines/{machine_id}/stop` | POST | Stop agent |
| `/v1/apps/{app_name}/machines/{machine_id}` | DELETE | Delete agent |
| `/v1/apps/{app_name}/machines/{machine_id}/wait` | GET | Wait for state |

---

## 1. Create Machine (Spawn Agent)

```typescript
POST /v1/apps/swrm/machines

{
  "config": {
    "image": "ghcr.io/zeroclaw-labs/zeroclaw:latest",
    "env": {
      "API_KEY": "user-api-key",
      "PROVIDER": "openai",
      "ZEROCLAW_MODEL": "gpt-4o-mini",
      "ZEROCLAW_SYSTEM_PROMPT_BASE64": "base64-encoded-prompt"
    },
    "guest": {
      "cpu_kind": "shared",
      "cpus": 1,
      "memory_mb": 256
    },
    "restart": {
      "policy": "on-failure"
    },
    "services": [{
      "protocol": "tcp",
      "internal_port": 42617,
      "ports": [{ "port": 443, "handlers": ["tls", "http"] }]
    }],
    "metadata": {
      "agentId": "agent_123",
      "userId": "user_456"
    }
  }
}
```

**Response:**
```json
{
  "id": "1857156b526dd8",
  "name": "aged-thunder-7371",
  "state": "created",
  "region": "ord",
  "private_ip": "fdaa:0:18:a7b:196:e274:9ce1:2",
  "config": { ... }
}
```

---

## 2. List Machines (Dashboard)

```typescript
GET /v1/apps/swrm/machines

// Optional filters:
?region=ord
&metadata.userId=user_456
&include_deleted=false
```

**Response:**
```json
[
  {
    "id": "1857156b526dd8",
    "name": "aged-thunder-7371",
    "state": "started",
    "region": "ord",
    "private_ip": "fdaa:0:18:a7b:196:e274:9ce1:2",
    "config": { ... }
  }
]
```

---

## 3. Get Machine (Status Check)

```typescript
GET /v1/apps/swrm/machines/{machine_id}
```

**Response:**
```json
{
  "id": "1857156b526dd8",
  "state": "started",
  "region": "ord",
  "private_ip": "fdaa:0:18:a7b:196:e274:9ce1:2",
  "checks": {
    "httpget": { "status": "passing" }
  }
}
```

---

## 4. Start Machine

```typescript
POST /v1/apps/swrm/machines/{machine_id}/start
```

**Response:**
```json
{
  "previous_state": "stopped",
  "migrated": false,
  "new_host": ""
}
```

---

## 5. Stop Machine

```typescript
POST /v1/apps/swrm/machines/{machine_id}/stop
```

**Response:**
```json
{ "ok": true }
```

---

## 6. Delete Machine

```typescript
DELETE /v1/apps/swrm/machines/{machine_id}?force=true
```

**Response:**
```json
{ "ok": true }
```

---

## 7. Wait for State (Health Check)

```typescript
GET /v1/apps/swrm/machines/{machine_id}/wait?state=started&timeout=30
```

**Response:**
```json
{ "ok": true }
```

---

## Machine States

| State | Description |
|-------|-------------|
| `created` | Machine created, not started |
| `started` | Running and healthy |
| `stopped` | Stopped, can restart |
| `suspended` | Paused with snapshot |
| `destroyed` | Deleted |

---

## Config Object (Simplified)

```typescript
{
  // Required
  "image": "registry/image:tag",
  
  // Environment
  "env": { "KEY": "value" },
  
  // Resources
  "guest": {
    "cpu_kind": "shared",     // or "performance"
    "cpus": 1,                // 1-16
    "memory_mb": 256          // 256-65536 (multiples of 256)
  },
  
  // Networking
  "services": [{
    "protocol": "tcp",
    "internal_port": 42617,
    "ports": [
      { "port": 443, "handlers": ["tls", "http"] },
      { "port": 80, "handlers": ["http"] }
    ]
  }],
  
  // Restart policy
  "restart": {
    "policy": "on-failure",   // "no", "on-failure", "always"
    "max_retries": 3
  },
  
  // Metadata (for filtering)
  "metadata": {
    "agentId": "...",
    "userId": "..."
  },
  
  // Health checks
  "checks": {
    "health": {
      "type": "http",
      "port": 42617,
      "path": "/health",
      "interval": "15s",
      "timeout": "10s"
    }
  }
}
```

---

## Convex Integration Example

```typescript
// convex/fly.ts
"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const FLY_API = "https://api.machines.dev";
const APP_NAME = "swrm";

async function flyFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${FLY_API}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${process.env.FLY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Fly API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const createMachine = internalAction({
  args: {
    agentId: v.id("agents"),
    apiKey: v.string(),
    provider: v.string(),
    model: v.optional(v.string()),
    systemPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    const machine = await flyFetch(`/v1/apps/${APP_NAME}/machines`, {
      method: "POST",
      body: JSON.stringify({
        config: {
          image: "ghcr.io/zeroclaw-labs/zeroclaw:latest",
          env: {
            API_KEY: args.apiKey,
            PROVIDER: args.provider,
            ZEROCLAW_MODEL: args.model || "gpt-4o-mini",
            ZEROCLAW_SYSTEM_PROMPT_BASE64: Buffer.from(args.systemPrompt).toString("base64"),
          },
          guest: {
            cpu_kind: "shared",
            cpus: 1,
            memory_mb: 256,
          },
          restart: { policy: "on-failure", max_retries: 3 },
          metadata: {
            agentId: args.agentId,
          },
          services: [{
            protocol: "tcp",
            internal_port: 42617,
            ports: [{ port: 443, handlers: ["tls", "http"] }],
          }],
          checks: {
            health: {
              type: "http",
              port: 42617,
              path: "/health",
              interval: "15s",
              timeout: "10s",
            },
          },
        },
      }),
    });

    return {
      machineId: machine.id,
      state: machine.state,
      privateIp: machine.private_ip,
      region: machine.region,
    };
  },
});

export const listMachines = internalAction({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId }) => {
    const query = userId ? `?metadata.userId=${userId}` : "";
    const machines = await flyFetch(`/v1/apps/${APP_NAME}/machines${query}`);
    return machines;
  },
});

export const getMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}`);
  },
});

export const startMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}/start`, {
      method: "POST",
    });
  },
});

export const stopMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}/stop`, {
      method: "POST",
    });
  },
});

export const deleteMachine = internalAction({
  args: { machineId: v.string() },
  handler: async (ctx, { machineId }) => {
    return await flyFetch(`/v1/apps/${APP_NAME}/machines/${machineId}?force=true`, {
      method: "DELETE",
    });
  },
});

export const waitForMachine = internalAction({
  args: {
    machineId: v.string(),
    state: v.string(),
    timeout: v.optional(v.number()),
  },
  handler: async (ctx, { machineId, state, timeout = 60 }) => {
    return await flyFetch(
      `/v1/apps/${APP_NAME}/machines/${machineId}/wait?state=${state}&timeout=${timeout}`
    );
  },
});
```

---

## Rate Limits

- **Most actions:** 1 req/s per machine (burst: 3 req/s)
- **Get Machine:** 5 req/s (burst: 10 req/s)
- **App deletions:** 100/minute

---

## Pricing (Machines)

| Size | vCPU | RAM | Price/hr |
|------|------|-----|----------|
| shared-cpu-1x | 1 | 256MB | $0.0016 |
| shared-cpu-2x | 2 | 512MB | $0.0032 |
| performance-1x | 1 | 2GB | $0.0139 |

**For Swrm:** `shared-cpu-1x` = ~$1.15/month if running 24/7

---

## Setup

1. **Create Fly app:**
   ```bash
   fly apps create swrm
   ```

2. **Get API token:**
   ```bash
   fly tokens deploy --app swrm
   ```

3. **Set in Convex:**
   ```
   npx convex env set FLY_API_TOKEN <token>
   ```

---

## Notes

- Machines auto-start when requests arrive (if `autostart: true`)
- Use `metadata` to filter by userId/agentId
- Health checks ensure machine is ready before routing traffic
- `private_ip` is reachable within Fly's private network
- Region auto-selected if not specified

---

*Reference: https://fly.io/docs/machines/api/machines-resource/*
