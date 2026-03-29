# File Layout

## CLI Source

- `bin/create-lumos-app.mjs` — hashbang entrypoint, just imports and calls `main()`
- `src/index.mjs` — orchestrator that calls each step in sequence
- `src/prompts.mjs` — all user-facing prompts via `@clack/prompts`
- `src/scaffold.mjs` — runs the underlying `create-next-app` or `create-expo-app`
- `src/overlay.mjs` — copies template files and strips conditional marker sections
- `src/integrations.mjs` — returns dependency lists and env vars per integration
- `src/packages.mjs` — modifies `package.json`, runs `pnpm add`/`npm install`
- `src/skills.mjs` — optional `npx skills add` runner
- `src/readme.mjs` — generates the project's README.md
- `src/success.mjs` — prints the final next-steps message
- `src/utils.mjs` — shared helpers (exec, JSON I/O, project name validation)

## Templates

`templates/` — real code files organized by `shared/`, `nextjs/`, `expo/`, then `base/` and per-integration subdirs.
