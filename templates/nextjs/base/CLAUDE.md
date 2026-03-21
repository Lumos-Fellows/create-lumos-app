# CLAUDE.md

## Environment Variables

Never use `process.env` directly in application code. All environment variables are validated through `src/env.ts` using `@t3-oss/env-nextjs` and Zod. Import and use the `env` object instead:

```ts
import { env } from "~/env";
env.NEXT_PUBLIC_SUPABASE_URL;
```

The only place `process.env` should appear is inside the `runtimeEnv` block of `src/env.ts` itself.

## Styling

Use Tailwind CSS v4 utility classes for all styling. Use design tokens from `globals.css` (e.g. `text-foreground`, `bg-background`, `text-muted-foreground`) rather than hardcoded colors. Use the `cn()` helper from `~/lib/utils` to merge conditional class names.

## Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with OKLCH design tokens, dark mode default
- **Linter/Formatter**: Biome
- **Import alias**: `~/` maps to `./src/*`
