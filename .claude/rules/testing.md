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

The e2e test scaffolds full Next.js and Expo projects non-interactively, verifying scaffold → overlay → package install → README generation. CI runs this on Node 18/20/22 via `.github/workflows/ci.yml`.
