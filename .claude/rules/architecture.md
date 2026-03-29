# Architecture

## Tech Stack

- Plain ESM JavaScript (`.mjs`) — no build step, no TypeScript for the CLI itself
- `@clack/prompts` for terminal UI
- `picocolors` for colored output
- Node built-ins only (`child_process`, `fs`, `path`) — no other runtime deps

## Key Decisions

- **No template engine**: Templates are real `.ts`/`.tsx` files. Conditional sections use `// -- TAG_START --` / `// -- TAG_END --` marker comments that get stripped by `overlay.mjs`.
- **`NO_` inverse sections**: `// -- NO_POSTHOG_START --` blocks are kept when PostHog is NOT selected, removed when it IS selected. Used for fallback JSX (e.g. bare `{children}` vs `<PostHogProvider>{children}</PostHogProvider>`).
- **TypeScript only**: Generated projects are always TypeScript. The CLI itself is plain JS.
- **pnpm preferred**: Default package manager recommendation. Enforced via `preinstall` script in generated projects.
