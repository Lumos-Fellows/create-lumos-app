# Testing

**Always run tests after changing `src/` or `templates/`.**

## Commands

Unit tests (fast, run first):

```bash
pnpm test:unit
```

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

The E2E suite disables Supabase telemetry so parallel framework tests do not race on the CLI's shared telemetry file.

CI also runs lint and unit tests on Node 24. Pull requests must include a new Changeset; see `.changeset/README.md` for release and intentional no-release changes.
