# Swrm Billing — Pay Per Agent

## Pricing Model

| Item | Price |
|------|-------|
| **Per Agent** | $5/agent/month |
| **Storage Included** | 1 GB (shared) |
| **Extra Storage** | $2/GB/month |

---

## How It Works

### Creating Agents
```
User creates agent
    ↓
No payment yet
    ↓
Agent spawns
    ↓
Added to monthly bill
```

### Monthly Billing
```
At end of month:
    ↓
Count active agents
    ↓
Calculate: agents × $5
    ↓
Check storage overage
    ↓
Add: (storage - 1GB) × $2
    ↓
Charge total
```

### Deleting Agents
```
User deletes agent
    ↓
Removed from next bill
    ↓
No partial refund (monthly)
```

---

## Example Bills

### User with 3 agents, 0.5GB storage
```
3 agents × $5 = $15
Storage: 0.5GB (within 1GB free)
Total: $15/month
```

### User with 5 agents, 2GB storage
```
5 agents × $5 = $25
Storage: 2GB - 1GB = 1GB overage
1GB × $2 = $2
Total: $27/month
```

### User with 1 agent, 5GB storage
```
1 agent × $5 = $5
Storage: 5GB - 1GB = 4GB overage
4GB × $2 = $8
Total: $13/month
```

---

## Implementation

### Billing Cycle
```
Daily: Calculate storage usage
Monthly: Charge agents + storage overage
```

### Storage Tracking
```typescript
// When content uploaded
storageUsedMb += contentSizeMb

// When content deleted
storageUsedMb -= contentSizeMb

// Check overage
if (storageUsedMb > storageLimitMb) {
  overageGb = (storageUsedMb - storageLimitMb) / 1024
  storageCost = overageGb * 2
}
```

---

## Margins

### With User's API Key
```
User pays: $5/agent
Cost: $0
Margin: 100%
```

### With Z AI Credits
```
User pays: $5/agent
Z AI cost: ~$0.10/agent (50 chats)
Margin: 98%
```

---

## Stripe Integration

### Products
```
- Agent ($5/month)
- Storage Overage ($2/GB/month)
```

### Billing
```
- Subscription per agent
- Metered billing for storage
```

---

## Break-even Analysis

| Scenario | Users | Agents | Monthly Revenue |
|----------|-------|--------|-----------------|
| Minimal | 50 | 75 | $375 |
| Traction | 500 | 1,000 | $5,000 |
| Growth | 2,000 | 5,000 | $25,000 |

---

*Simple pricing. Sustainable business.*
