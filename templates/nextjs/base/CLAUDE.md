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

// -- SUPABASE_START --
## Database Migrations

All database schema changes must go through Supabase CLI migrations — never modify the database manually.

### Workflow

1. Create a new migration:
   ```bash
   npx supabase migration new <short_description>
   ```
   This creates a timestamped SQL file in `supabase/migrations/`.

2. Write your SQL in the generated file. Follow these rules:
   - Add a header comment explaining the purpose
   - Always enable RLS: `alter table <table> enable row level security;`
   - Write granular RLS policies: one per operation (`select`, `insert`, `update`, `delete`) and per role (`anon`, `authenticated`). Never use `FOR ALL`.
   - Use `if not exists` / `if exists` guards where appropriate
   - Add indexes on columns referenced in RLS policies that are not already primary keys

3. Test locally:
   ```bash
   npx supabase db reset
   ```
   This destroys and recreates the local DB, replaying all migrations from scratch.

4. Check migration status:
   ```bash
   npx supabase migration list
   ```

5. Deploy to remote (after `supabase link`):
   ```bash
   npx supabase db push --dry-run   # preview first
   npx supabase db push             # apply
   ```

### Rules

- Never reset or revert a migration that has been deployed to production — always roll forward
- Never modify an existing migration file after it has been applied — create a new one instead
- Commit all migration files to version control
// -- SUPABASE_END --
