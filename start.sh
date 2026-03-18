#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --legacy-peer-deps
fi

echo ""
echo "  Life OS"
echo "  ───────────────────────────────────"
echo "  Starting dev server at http://localhost:5173"
echo "  Press Ctrl+C to stop"
echo ""

npm run dev
