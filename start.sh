#!/bin/bash

# Start both backend and app

# Kill existing processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

echo "🐝 Starting Swrm..."

# Start backend
echo "📦 Starting backend..."
cd backend
bun run dev &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3

# Check backend
if ! curl -s http://localhost:3001/health > /dev/null; then
  echo "❌ Backend failed to start"
  exit 1
fi
echo "✅ Backend running on http://localhost:3001"

# Start app
echo "📱 Starting app..."
cd app
npx expo start

# Wait for all background jobs
wait
