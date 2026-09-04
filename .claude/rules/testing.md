# Testing

**Always run tests after changing `src/` or `templates/`.**

## Commands

Unit tests (fast, run first):

```bash
pnpm test:unit
```

Lint the CLI and tests with Biome and anti-slop (Oxlint):

```bash
pnpm lint
```

Unit tests run anti-slop across every integration combination after applying the overlays, because raw templates contain mutually exclusive declarations. Smoke tests also verify that the copied plugin rejects violations. E2E tests run each generated project's combined lint script after installing dependencies and UI components.

E2E tests (scaffolds real projects, slow):

```bash
pnpm test
```

Manual/interactive testing:

```bash
node bin/create-lumos-app.mjs test-app
# Then: cd test-app && pnpm dev
```

## What the tests cover

The e2e test scaffolds full Next.js and Expo projects non-interactively, verifying scaffold → overlay → package install → README generation. CI runs this on Node 20/22 on Linux, Windows, and macOS via `.github/workflows/ci.yml`. Each scaffold case has a five-minute timeout, and CI bounds each matrix job to 20 minutes.

The E2E suite runs framework groups sequentially for stable subprocess output, uses CI mode to prevent scaffolder prompts, and disables Supabase telemetry. Generated apps get a Git root before linting so Oxlint does not inherit this repo's ignored E2E directory pattern.

CI also runs lint and unit tests on Node 24. Pull requests must include a new Changeset; see `.changeset/README.md` for release and intentional no-release changes.
