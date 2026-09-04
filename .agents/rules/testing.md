# Validation decisions

- Run unit tests before E2E tests so inexpensive failures are caught before scaffolding and dependency installation.
- Lint template output after applying overlays: mutually exclusive declarations make some raw templates invalid programs. Cover both sides of conditional integrations.
- Verify generated instruction links after overlay processing, including optional integration rules. Ensure Claude imports the same `AGENTS.md` used by other harnesses.
- E2E tests must run the generated typecheck and lint scripts after dependencies and UI components are installed; template-only checks cannot validate downloaded components.
- Keep scaffold/build/lint subprocesses sequential to avoid unstable Node test-runner output. Run scaffolders in CI mode to avoid interactive prompts and disable Supabase telemetry to avoid shared-file races.
- Give generated test apps their own Git root before linting so they do not inherit the parent repo's ignored E2E directory patterns.
- Do not rely on agent hooks as the only enforcement. CI must run typechecking, a package build, lint, unit tests, E2E tests, and the Changeset check.
