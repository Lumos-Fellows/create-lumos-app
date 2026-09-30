#!/usr/bin/env bash
set -u

if ! command -v node >/dev/null 2>&1; then
  echo "Checks could not run: install Node.js, then install this project's dependencies." >&2
  exit 2
fi

if [ ! -d node_modules ]; then
  echo "Checks could not run: install this project's dependencies first." >&2
  exit 2
fi

if ! node --import tsx "$(dirname "${BASH_SOURCE[0]}")/agent-stop.ts" >&2; then
  exit 2
fi
