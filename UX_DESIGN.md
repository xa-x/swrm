# Swrm UX Design Document

## Target Users

| User Type | Description | Priority |
|-----------|-------------|----------|
| Non-technical | Want AI agents without complexity | Primary |
| Developers | Quick agent deployment | Secondary |
| Power users | Manage multiple agents | Tertiary |

---

## Core User Flows

### Flow 1: First-Time User → First Chat
```
1. Open app → Sign in (Clerk)
2. See empty state → "Create your first agent"
3. Simple form (3 required fields):
   - Name ("My Assistant")
   - What should it do? ("Help me with...")
   - API Key (paste from provider)
4. Tap Create → Loading ("Spawning agent..." 5-15s)
5. Agent ready → Chat screen opens
6. Send first message → Get response
7. Success!

Target time: < 60 seconds
```

### Flow 2: Returning User → Chat
```
1. Open app → See agent list
2. Tap agent → Opens chat
3. Send message → Get response
4. Done

Target time: < 5 seconds
```

### Flow 3: Manage Agents
```
1. Long-press agent → Context menu
2. Options:
   - Start (if stopped)
   - Stop (if running)
   - Edit (change name/prompt)
   - Delete (with confirmation)
3. Action confirmed → Status updates
```

---

## Screen Specifications

### Screen 1: Agent List (Home)

```
┌─────────────────────────────────────┐
│  ← My Agents              ⚙️        │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤖 My Assistant      🟢      │   │
│  │ Help with daily tasks       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📊 Data Analyst      ⚪      │   │
│  │ Analyze spreadsheets        │   │
│  └─────────────────────────────┘   │
│                                     │
│              [+ FAB]                │
└─────────────────────────────────────┘

Empty State:
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         🤖                          │
│    No agents yet                    │
│                                     │
│  [Create your first agent]          │
│                                     │
└─────────────────────────────────────┘
```

**Interactions:**
- Tap card → Open chat
- Long press → Context menu (start/stop/edit/delete)
- FAB → Create new agent

---

### Screen 2: Create Agent

```
┌─────────────────────────────────────┐
│  ← New Agent                        │
├─────────────────────────────────────┤
│                                     │
│  Name *                             │
│  ┌─────────────────────────────┐   │
│  │ My Assistant                │   │
│  └─────────────────────────────┘   │
│                                     │
│  What should it do? *               │
│  ┌─────────────────────────────┐   │
│  │ Help me with daily tasks... │   │
│  │                             │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Provider *                         │
│  ┌─────────────────────────────┐   │
│  │ OpenAI                ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│  API Key *                          │
│  ┌─────────────────────────────┐   │
│  │ ••••••••••••••••••••        │   │
│  └─────────────────────────────┘   │
│  Where do I get an API key?         │
│                                     │
│  Model (optional)                   │
│  ┌─────────────────────────────┐   │
│  │ GPT-4o                ▼     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Create Agent          │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

Loading State:
┌─────────────────────────────────────┐
│                                     │
│                                     │
│            🔄                       │
│     Spawning your agent...          │
│                                     │
│          [Cancel]                   │
│                                     │
└─────────────────────────────────────┘
```

**Validation:**
- Name: Required, max 50 chars
- Instructions: Required, max 1000 chars
- Provider: Required, dropdown
- API Key: Required, format validation per provider
- Model: Optional, dropdown based on provider

---

### Screen 3: Chat

```
┌─────────────────────────────────────┐
│  ← My Assistant      🟢        ⋮    │
├─────────────────────────────────────┤
│                                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Hello! How can I help you   │   │
│  │ today?                      │   │
│  └─────────────────────────────┘   │
│                                     │
│         ┌───────────────────┐      │
│         │ Help me plan my   │      │
│         │ day               │      │
│         └───────────────────┘      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Of course! Let's start by   │   │
│  │ listing your tasks...       │   │
│  └─────────────────────────────┘   │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ Type a message...      ➤   │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Loading State (typing indicator):
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ● ● ●  Thinking...          │   │
│  └─────────────────────────────┘   │
│                                     │

Empty State:
│                                     │
│         💬                          │
│   Send a message to start           │
│                                     │
```

**Menu Options (⋮):**
- Stop Agent
- Edit Agent
- Delete Agent
- View Usage

**Privacy Note:**
- NO message history stored
- Each chat session is fresh
- Clear "No history saved" indicator

---

## Agent States

| Status | Visual | User Sees | Actions |
|--------|--------|-----------|---------|
| creating | 🟡 Spinner | "Spawning..." | Cancel |
| running | 🟢 Dot | "Running" | Chat, Stop |
| stopped | ⚪ Dot | "Sleeping" | Start, Edit, Delete |
| error | 🔴 Dot | "Error" | Retry, Delete |

---

## Micro-Copy

### Loading States
- Creating: "Spawning your agent..."
- Starting: "Waking up..."
- Chat: "Thinking..." / "Agent is typing..."
- Stopping: "Putting to sleep..."

### Error Messages
- Bad API key: "Your API key doesn't look right. Double-check it?"
- Agent failed: "Couldn't start your agent. Check your API key and try again."
- Timeout: "Taking too long. Try again?"
- No internet: "You're offline. Check your connection."

### Success Messages
- Created: "Ready to chat!"
- Started: "Agent is awake"
- Stopped: "Agent is sleeping"
- Deleted: "Agent deleted"

---

## Onboarding (3 Steps)

### Step 1: What is Swrm?
- "Create AI agents that work for you"
- Animation of agent appearing
- CTA: "Get Started"

### Step 2: How it works
1. Create an agent (give it a job)
2. Add your API key
3. Chat anytime
- CTA: "Next"

### Step 3: Get your API key
- Provider selection
- Deep link to provider dashboard
- "Copy your key and come back"
- CTA: "I have my key"

→ Redirect to Create Agent

---

## Accessibility

- Min tap target: 44x44px
- Color contrast: WCAG AA (4.5:1)
- Status: Never color alone (icon + text)
- Screen reader: Meaningful labels
- Animations: Respect reduce-motion

---

## Design Tokens

### Colors
- Primary: Brand (CTAs)
- Success: Green (running)
- Warning: Yellow (transitional)
- Error: Red (errors)
- Neutral: Gray scale

### Typography
- Headings: Bold, larger
- Body: Regular, readable
- Caption: Small, muted

### Spacing
- 4px base unit
- 8px related elements
- 16px sections
- 24px screen padding

---

## Future Features (Post-MVP)

- Streaming responses
- File attachments
- Voice messages
- Channel integrations
- Agent templates
- Built-in API credits
- Usage dashboard
- Team sharing
- Agent marketplace

---

## MVP Priority

**Create → Chat → Manage**

Everything else comes later.
