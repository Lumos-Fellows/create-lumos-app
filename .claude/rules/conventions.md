# Conventions for Generated Projects

These match patterns from tripleclone, convexity, and other Lumos Fellows projects:

- `~/` import alias → `./src/*` (Next.js) or `./*` (Expo)
- Biome v2 for linting/formatting, plus anti-slop rules through Oxlint. `pnpm lint` runs both.
- Anti-slop is vendored as JavaScript in `templates/shared/tools/oxlint/anti-slop/` so Node 20 can load it without a TypeScript loader. Root `.oxlintrc.json` extends the shared template config; keep `oxlint` and `@oxlint/plugins` pinned to the same exact version in the repo and generated projects.
- `@t3-oss/env-nextjs` + Zod for env validation (Next.js), plain Zod (Expo)
- Tailwind CSS v4 with OKLCH design tokens, light/dark theme support
- shadcn/ui with CVA variants, `cn()` utility (`clsx` + `tailwind-merge`)
- All integrations gracefully no-op without env vars
- Expo template file names must use kebab-case
- **NativeWind only (Expo)**: Expo templates must use NativeWind `className` for all styling — never `StyleSheet.create()` or inline `style` objects. The only exception is React Navigation's `screenOptions` API (e.g. `tabBarStyle`) which requires plain style objects since it doesn't support `className`.
