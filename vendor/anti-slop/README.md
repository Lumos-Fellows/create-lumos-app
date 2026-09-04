# Anti-slop

Vendored from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop),
revision [`e8c4880471b23ab7f216fba7b27d173a6ef07d4c`](https://github.com/dmmulroy/anti-slop/tree/e8c4880471b23ab7f216fba7b27d173a6ef07d4c).
The upstream MIT license is included in `LICENSE`.

All 15 generic rules are enabled as errors in `.oxlintrc.json`. Biome handles
general linting and formatting; Oxlint runs the anti-slop rules. The optional
Effect plugin is included but is not enabled for these templates.

create-lumos-app keeps the TypeScript source in `vendor/anti-slop/` and generates
JavaScript for its app templates. Rule behavior is unchanged. Node 20 can load
those `.mjs` files without a TypeScript loader; apps receive the compiled plugin
and do not need to build it. Biome and Oxlint exclude the generated plugin.

The generated template directory is ignored by Git. Local startup, lint, tests,
and packaging regenerate it automatically so a fresh checkout works without
committing a second copy of the rules.

## Updating the copy

Replace `vendor/anti-slop/` in create-lumos-app with the selected upstream
revision's `src/` files (excluding tests), and copy its `LICENSE`. Update the
revision above, then run `pnpm build:rules` to typecheck and regenerate the plugin.
Review the source diff, then run `pnpm verify`.

Keep `oxlint` and `@oxlint/plugins` pinned to the same exact version in the root
`package.json` and `src/packages.ts`. Generated apps own their copied plugin and
can adapt the rules to their team's standards.
