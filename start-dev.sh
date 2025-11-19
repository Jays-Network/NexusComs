#!/bin/bash

echo "Starting World Risk development servers..."

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

# Start both frontend and backend
npx concurrently \
  --names "BACKEND,EXPO" \
  --prefix-colors "blue,green" \
  "cd backend && node src/server.js" \
  "EXPO_PACKAGER_PROXY_URL=https://\$REPLIT_DEV_DOMAIN REACT_NATIVE_PACKAGER_HOSTNAME=\$REPLIT_DEV_DOMAIN npx expo start"
