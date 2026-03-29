# CLAUDE.md

## Project Overview

`create-lumos-app` is a CLI scaffolding tool for Lumos Fellows. It wraps `create-next-app` and `create-expo-app`, then layers course-specific templates on top. Target users are students who need a zero-confusion setup experience.

## Tech Stack

- Plain ESM JavaScript (`.mjs`) — no build step, no TypeScript for the CLI itself
- `@clack/prompts` for terminal UI
- `picocolors` for colored output
- Node built-ins only (`child_process`, `fs`, `path`) — no other runtime deps

## Key Architecture Decisions

- **No template engine**: Templates are real `.ts`/`.tsx` files. Conditional sections use `// -- TAG_START --` / `// -- TAG_END --` marker comments that get stripped by `overlay.mjs`.
- **`NO_` inverse sections**: `// -- NO_POSTHOG_START --` blocks are kept when PostHog is NOT selected, removed when it IS selected. Used for fallback JSX (e.g. bare `{children}` vs `<PostHogProvider>{children}</PostHogProvider>`).
- **TypeScript only**: Generated projects are always TypeScript. The CLI itself is plain JS.
- **pnpm preferred**: Default package manager recommendation. Enforced via `preinstall` script in generated projects.

## Conventions for Generated Projects

These match patterns from tripleclone, convexity, and other Lumos Fellows projects:

- `~/` import alias → `./src/*` (Next.js) or `./*` (Expo)
- Biome v2 for linting/formatting (not ESLint + Prettier)
- `@t3-oss/env-nextjs` + Zod for env validation (Next.js), plain Zod (Expo)
- Tailwind CSS v4 with OKLCH design tokens, light/dark theme support
- shadcn/ui with CVA variants, `cn()` utility (`clsx` + `tailwind-merge`)
- All integrations gracefully no-op without env vars
- **NativeWind only (Expo)**: Expo templates must use NativeWind `className` for all styling — never `StyleSheet.create()` or inline `style` objects. The only exception is React Navigation's `screenOptions` API (e.g. `tabBarStyle`) which requires plain style objects since it doesn't support `className`.

## File Layout

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
- `templates/` — real code files organized by `shared/`, `nextjs/`, `expo/`, then `base/` and per-integration subdirs

## Testing

**Always run tests after changing `src/` or `templates/`.**

Unit tests (fast, run first):

```bash
pnpm test:unit
```

E2E tests (scaffolds real projects, slow):

```bash
pnpm test
```

The e2e test scaffolds full Next.js and Expo projects non-interactively, verifying scaffold → overlay → package install → README generation. CI runs this on Node 18/20/22 via `.github/workflows/ci.yml`.

For manual/interactive testing:

```bash
node bin/create-lumos-app.mjs test-app
# Then: cd test-app && pnpm dev
```

## Common Tasks

- **Add a new integration**: Add template files under `templates/<framework>/<name>/`, add deps to `integrations.mjs`, add env vars to `getEnvVars()`, add marker comments in layout/env templates, add the prompt toggle in `prompts.mjs`.
- **Modify generated code**: Edit the files directly in `templates/`. What's in the template is what gets copied.
- **Change a prompt default**: Edit `prompts.mjs` — each prompt has an `initialValue`.
