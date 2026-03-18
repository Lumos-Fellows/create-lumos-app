#!/bin/bash
# Runs biome check (lint + format) on files changed by Edit/Write tool calls.
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only check files that biome can handle
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.mjs|*.js|*.ts|*.tsx|*.jsx|*.json|*.css)
    ;;
  *)
    exit 0
    ;;
esac

# Skip template files (they have intentional marker comments)
if [[ "$FILE_PATH" == *"/templates/"* ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

OUTPUT=$(pnpm biome check --write "$FILE_PATH" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Biome found issues in $FILE_PATH:" >&2
  echo "$OUTPUT" >&2
  exit 2
fi

exit 0
