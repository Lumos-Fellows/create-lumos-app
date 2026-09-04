# Project instructions

## Working agreements

- Keep shared instructions here and in `.agents/rules/`. `CLAUDE.md` must contain only `@AGENTS.md`; reserve `.claude/` for Claude-specific configuration and hook wiring.
- Use the package manager recorded in `package.json` and its lockfile. After code changes, run its `verify` script and resolve failures before finishing.
- Integrations must gracefully no-op without environment variables so the app can start before external services are configured.
- Keep README additions limited to context that cannot be inferred directly from source or configuration. Keep agent guidance focused on constraints, rationale, exceptions, and recurring mistakes.

## Rules Index

Before starting work, read each rules file whose scope applies to the task. `.agents/rules/` is an organizational convention; do not assume a harness automatically loads its files. When adding, updating, or deleting a rules file, keep this index in sync.

- Before adding or changing environment variable access, read [env-vars.md](.agents/rules/env-vars.md).
- Before editing UI or styles, read [styling.md](.agents/rules/styling.md).
// -- SUPABASE_START --
- Before changing database schemas, migrations, or access policies, read [supabase.md](.agents/rules/supabase.md).
// -- SUPABASE_END --
