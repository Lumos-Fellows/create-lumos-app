# Generated project conventions

- Integrations must gracefully no-op without environment variables so students can run a new app before configuring external services.
- Keep anti-slop’s TypeScript as the only tracked rule source. Generate its ignored template output before checks and packaging; ship compiled JavaScript so apps can load it without a TypeScript loader. Pin `oxlint` and `@oxlint/plugins` to the same exact version in the repo and generated projects.
- Use NativeWind `className` for Expo styling. React Navigation's `screenOptions` is the exception because it requires plain style objects.
- Use kebab-case for Expo file names, except names required by Expo Router and harness entry points such as `AGENTS.md` and `CLAUDE.md`.
- Generate shared instructions in `AGENTS.md` and `.agents/rules/`, with a `CLAUDE.md` import. Keep universal constraints in `AGENTS.md` and give every detailed rule an explicit reading trigger.
- When adding an integration rule, condition its index entry on the same integration flag. Check both enabled and disabled output for missing or stale links.
- Keep verification in package scripts that any harness or developer can run. Claude hooks should delegate to those scripts and translate failures into Claude's blocking exit status.

- Typecheck tooling as well as app code. Keep JavaScript only where a tool needs it, and enable `checkJs` with typed JSDoc at external boundaries.
