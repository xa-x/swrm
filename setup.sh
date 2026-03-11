#!/bin/bash

# Swrm - Quick Start Script

echo "🐝 Swrm Setup"
echo "============"

# Check prerequisites
command -v bun >/dev/null 2>&1 || { echo "❌ Bun not installed. Install: curl -fsSL https://bun.sh/install | bash"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed. Install: https://docs.docker.com/get-docker/"; exit 1; }

# Check Docker is running
docker info >/dev/null 2>&1 || { echo "❌ Docker not running. Start Docker Desktop."; exit 1; }

echo "✅ Prerequisites OK"

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
  echo "Creating backend/.env..."
  cp .env.example .env 2>/dev/null || echo "PORT=3001" > .env
fi

bun install
echo "✅ Backend ready"

# App setup
echo ""
echo "📱 Setting up app..."
cd ../app

if [ ! -f ".env" ]; then
  echo "Creating app/.env..."
  echo "EXPO_PUBLIC_API_URL=http://localhost:3001" > .env
  echo "EXPO_PUBLIC_CLERK_KEY=pk_test_your_key" >> .env
  echo "⚠️  Edit app/.env and add your Clerk key"
fi

npm install
echo "✅ App ready"

# Pull ZeroClaw image
echo ""
echo "🐳 Pulling ZeroClaw image..."
docker pull ghcr.io/zeroclaw-labs/zeroclaw:latest
echo "✅ ZeroClaw image ready"

echo ""
echo "🚀 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add your Clerk key to app/.env"
echo "  2. Start backend: cd backend && bun run dev"
echo "  3. Start app: cd app && npx expo start"
echo ""
echo "Or start both:"
echo "  ./start.sh"
