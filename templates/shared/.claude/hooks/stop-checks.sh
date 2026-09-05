#!/bin/sh
set -u

if [ -f pnpm-lock.yaml ]; then
  PM=pnpm
elif [ -f package-lock.json ]; then
  PM=npm
else
  PM=pnpm
fi

if ! command -v "$PM" >/dev/null 2>&1; then
  echo "Skipping checks: $PM is not installed." >&2
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Skipping checks: node_modules is not installed in this worktree. Run $PM install before relying on hook checks." >&2
  exit 0
fi

if ! "$PM" run verify >&2; then
  exit 2
fi

echo "All checks passed." >&2
