# Swrm Setup Guide

## 1. Create GitHub Repository

```bash
# Option A: Create via GitHub web UI
# Go to https://github.com/new
# Name: swrm
# Description: Deploy AI agents. Control from anywhere.
# Public or Private
# Don't initialize (we have code)

# Option B: Use gh CLI
gh auth login
gh repo create xa-x/swrm --public --source=. --push
```

## 2. Push to GitHub

```bash
cd ~/.openclaw/workspace/swrm

# Add remote (if created via web)
git remote add origin https://github.com/xa-x/swrm.git

# Push
git push -u origin main
```

## 3. Set Up Convex

```bash
# Install Convex CLI
npm install -g convex

# Login
npx convex login

# Deploy (creates backend automatically)
npx convex deploy

# This will output your CONVEX_URL, e.g.:
# https://your-name-123.convex.cloud
```

## 4. Configure Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app for containers
fly apps create swrm-agents

# Generate long-lived token
fly tokens create deploy -x 999999h

# Add token to Convex
npx convex env set FLY_API_TOKEN <your-token>
npx convex env set FLY_APP_NAME swrm-agents
```

## 5. Set Up App

```bash
cd app

# Copy env
cp .env.example .env

# Add Convex URL
echo "EXPO_PUBLIC_CONVEX_URL=https://your-name.convex.cloud" >> .env

# Install
npm install

# Run
npx expo start
```

## 6. Configure Clerk (Auth)

```bash
# Go to https://clerk.com
# Create app
# Copy publishable key

# Add to app/.env
echo "EXPO_PUBLIC_CLERK_KEY=pk_test_..." >> .env
```

## 7. Deploy to Production

```bash
# Deploy Convex
npx convex deploy

# Build app
cd app
eas build --platform ios
eas submit
```

---

## 🎯 Summary

| Step | Command | Time |
|------|---------|------|
| Create GitHub repo | `gh repo create` | 1 min |
| Push code | `git push` | 30 sec |
| Set up Convex | `npx convex deploy` | 2 min |
| Set up Fly.io | `fly apps create` | 1 min |
| Configure env | `npx convex env set` | 1 min |
| Run app | `npx expo start` | 30 sec |

**Total: ~5 minutes to MVP**

---

## 📊 Dashboard Access

- **Convex**: https://dashboard.convex.dev
- **Fly.io**: https://fly.io/dashboard
- **Clerk**: https://dashboard.clerk.com

---

## 🔑 Environment Variables

### Convex (set via `npx convex env set`)
```
FLY_API_TOKEN=...
FLY_APP_NAME=swrm-agents
```

### App (set in `app/.env`)
```
EXPO_PUBLIC_CONVEX_URL=https://...
EXPO_PUBLIC_CLERK_KEY=pk_test_...
```

---

## 🚨 Troubleshooting

### Convex won't deploy
```bash
# Check auth
npx convex whoami

# Re-login
npx convex logout
npx convex login
```

### Fly.io token invalid
```bash
# Generate new token
fly tokens create deploy -x 999999h

# Update in Convex
npx convex env set FLY_API_TOKEN <new-token>
```

### App won't connect to Convex
```bash
# Check CONVEX_URL
cat app/.env

# Should be:
EXPO_PUBLIC_CONVEX_URL=https://your-name.convex.cloud
```
