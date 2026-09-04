# Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with OKLCH design tokens, light/dark theme support
- **Linting**: Biome + anti-slop (Oxlint); run `pnpm lint` to check both
- **Formatting**: Biome
- **Anti-slop rules**: `.oxlintrc.json`; vendored plugin in `tools/oxlint/anti-slop/`
- **Import alias**: `~/` maps to `./src/*`
