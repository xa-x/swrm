# Swrm — Folder Structure

```
app/
├── _layout.tsx                    # Root layout
│
├── (onboarding)/
│   ├── _layout.tsx               # Redirects based on auth
│   └── index.tsx                 # Onboarding flow
│
├── (auth)/
│   ├── _layout.tsx               # Auth layout
│   └── index.tsx                 # Sign in (Clerk UI only)
│
├── (app)/                        # Protected routes
│   ├── _layout.tsx               # Auth guard + Convex provider
│   ├── index.tsx                 # Agent list (home)
│   ├── create.tsx                # Create agent (2 fields)
│   │
│   └── (agents)/
│       ├── _layout.tsx           # Agent layout
│       └── [id].tsx              # Chat with agent
│
└── settings/
    ├── _layout.tsx               # Settings layout
    └── index.tsx                 # Settings screen
```

---

## 🎯 User Flow

```
1. Open app
   ↓
2. (onboarding) checks auth
   ├─ Not signed in → (auth)
   └─ Signed in → (app)
   ↓
3. (app)/index → Agent list
   ├─ Empty state → Create agent
   └─ Agent cards → Tap to chat
   ↓
4. (app)/(agents)/[id] → Chat
   ├─ Send message
   ├─ Get response
   └─ No storage (privacy-first)
   ↓
5. settings → Account, subscription, etc.
```

---

## 🔐 Auth Flow

```
(onboarding)/_layout.tsx
    ↓ Check auth
    ├─ isSignedIn = false → Redirect to (auth)
    └─ isSignedIn = true → Redirect to (app)

(auth)/index.tsx
    ↓ Show Clerk <SignIn />
    ↓ User signs in
    ↓ Clerk updates auth state
    ↓ (onboarding) redirects to (app)

(app)/_layout.tsx
    ↓ Auth guard
    ├─ !isSignedIn → Redirect to (auth)
    └─ isSignedIn → Render <Slot />
```

---

## 📱 Screens

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Onboarding | No |
| `/(auth)` | Sign in | No |
| `/(app)` | Agent list | Yes |
| `/(app)/create` | Create agent | Yes |
| `/(app)/(agents)/[id]` | Chat with agent | Yes |
| `/settings` | App settings | Yes |

---

## 🛡️ Privacy

- **No message storage** — messages only exist in component state
- **API keys encrypted** — AES-256-GCM
- **No tracking** — minimal analytics

---

## 🎨 UX Principles

1. **2 fields to create agent** — Name + API Key
2. **Auto-detect provider** — Smart detection from key format
3. **Privacy-first** — No message history
4. **Simple navigation** — Stack-based, intuitive flow
5. **Fast** — Real-time Convex subscriptions

---

## 📦 Key Files

```
convex/
├── schema.ts          ← Privacy-first schema
├── agents.ts          ← CRUD + auth
├── docker.ts          ← Auto-pairing spawn
├── chat.ts            ← Direct webhook (no storage)
├── encryption.ts      ← AES-256-GCM
└── usage.ts           ← Token tracking

app/
├── _layout.tsx        ← Root layout
├── (app)/
│   ├── _layout.tsx    ← Auth guard
│   ├── index.tsx      ← Agent list
│   ├── create.tsx     ← 2-field form
│   └── (agents)/[id].tsx ← Chat
└── settings/index.tsx ← Settings
```

---

## 🚀 Ready to Test

```bash
cd /Users/x/.openclaw/workspace/swrm
bun run dev
```

---

## 💰 Business Model

- **$5/agent/month**
- **No free tier**
- **99-100% margins**

---

*Swrm — AI Agents for Everyone*
