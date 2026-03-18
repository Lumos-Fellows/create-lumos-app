# create-lumos-app

A one-command scaffolding CLI for Lumos Fellows. Create production-ready Next.js or Expo apps with best-practice defaults.

```bash
npx create-lumos-app@latest
```

Or with a project name:

```bash
npx create-lumos-app@latest my-app
```

## What You Get

- **Next.js** (App Router) or **Expo** (React Native tabs) — your choice
- **TypeScript** with strict config
- **Tailwind CSS v4** with OKLCH design tokens and dark mode default (Next.js)
- **shadcn/ui** pre-configured with Button component and CVA variants (Next.js)
- **Biome** for linting and formatting (no ESLint + Prettier)
- **Zod env validation** — missing env vars throw clear errors at startup
- **`~/` import alias** mapped to `./src/*` (Next.js) or `./*` (Expo)

## Optional Integrations

Toggled during setup — only selected integrations are included in the generated code:

| Integration | Next.js | Expo |
|-------------|---------|------|
| **Supabase** | `@supabase/ssr` with client/server helpers + middleware | `@supabase/supabase-js` with AsyncStorage |
| **PostHog** | `posthog-js` with provider component | `posthog-react-native` |
| **Sentry** | `@sentry/nextjs` with client + server configs | `@sentry/react-native` |

All integrations gracefully no-op when env vars are missing — no runtime errors without keys.

## Generated Project Scripts

| Command | Description |
|---------|-------------|
| `dev` | Start development server |
| `build` | Build for production |
| `format` | Format code with Biome |
| `lint` | Lint code with Biome |
| `typecheck` | Run TypeScript type checking |

## How It Works

1. Prompts for project name, framework, package manager, and integrations
2. Runs `create-next-app` or `create-expo-app` under the hood
3. Overlays Lumos templates (real code files, not string interpolation)
4. Strips conditional sections for unselected integrations via marker comments
5. Installs integration dependencies
6. Assembles `.env.example` and `.env.local` with relevant vars
7. Generates a project README

## Development

```bash
# Install CLI dependencies
pnpm install

# Run locally
node bin/create-lumos-app.mjs my-test-app

# Dry-run publish check
npm publish --dry-run
```

## Architecture

- Plain ESM JavaScript (`.mjs`) — no build step
- `@clack/prompts` for terminal UI, `picocolors` for colors
- Templates are real `.ts`/`.tsx` files with `// -- INTEGRATION_START --` / `// -- INTEGRATION_END --` marker comments for conditional stripping
- No template engine, no codegen — what you see in `templates/` is what gets copied

## Project Structure

```
create-lumos-app/
├── bin/create-lumos-app.mjs     # CLI entrypoint
├── src/
│   ├── index.mjs                # Main orchestrator
│   ├── prompts.mjs              # Interactive prompts
│   ├── scaffold.mjs             # Runs create-next-app / create-expo-app
│   ├── overlay.mjs              # Copies templates, strips conditionals
│   ├── integrations.mjs         # Dep lists per integration
│   ├── packages.mjs             # package.json modifications + install
│   ├── skills.mjs               # Optional skills.sh runner
│   ├── readme.mjs               # Generates project README
│   ├── success.mjs              # Prints next-steps output
│   └── utils.mjs                # Shared helpers
└── templates/
    ├── shared/                  # Common to both frameworks
    ├── nextjs/{base,supabase,posthog,sentry}/
    └── expo/{base,supabase,posthog,sentry}/
```

## License

MIT
