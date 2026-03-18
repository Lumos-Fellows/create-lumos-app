#!/bin/bash
# Runs biome check (lint + format) on files changed during the session.
# Used as a Stop hook so it only runs once after Claude finishes all edits.
INPUT=$(cat)

# Guard against infinite loops: don't re-run if already active
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Get staged + unstaged changed files (excluding templates)
FILES=$(git diff --name-only HEAD 2>/dev/null; git diff --name-only --cached 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)
FILES=$(echo "$FILES" | sort -u | grep -v '^templates/' | grep -E '\.(mjs|js|ts|tsx|jsx|json|css)$')

if [ -z "$FILES" ]; then
  exit 0
fi

# Run biome on all changed files at once
OUTPUT=$(echo "$FILES" | xargs pnpm biome check --write 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  jq -n --arg reason "Biome found issues in changed files. Please review and fix:\n$OUTPUT" \
    '{"decision": "block", "reason": $reason}'
fi

exit 0
