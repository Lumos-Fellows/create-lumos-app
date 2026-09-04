# Anti-slop

Vendored from [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop),
revision [`e8c4880471b23ab7f216fba7b27d173a6ef07d4c`](https://github.com/dmmulroy/anti-slop/tree/e8c4880471b23ab7f216fba7b27d173a6ef07d4c).
The upstream MIT license is included in `LICENSE`.

All 15 generic rules are enabled as errors in `.oxlintrc.json`. Biome handles
general linting and formatting; Oxlint runs the anti-slop rules. The optional
Effect plugin is included but is not enabled for these templates.

This copy is JavaScript emitted from upstream's TypeScript, with relative `.ts`
imports changed to `.mjs`. Rule behavior is unchanged. This lets Node 20 load the
plugin without a TypeScript loader and keeps its implementation out of app
typechecking. Biome and Oxlint exclude the vendored directory from their checks.
Keep `oxlint` and `@oxlint/plugins` pinned to the same exact version (currently
`1.81.0`) when upgrading.

## Updating the copy

Clone the upstream repo and check out the revision you want to review. In
create-lumos-app, regenerate the JavaScript from that checkout using Node.js
22.13+ (this copy was generated with Node 25.8.2):

```bash
node --input-type=module - /path/to/anti-slop <<'NODE'
import { stripTypeScriptTypes } from 'node:module';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const upstream = process.argv[2];
const source = join(upstream, 'src');
const destination = 'templates/shared/tools/oxlint/anti-slop';
for (const file of readdirSync(destination, { recursive: true })) {
  if (file.endsWith('.mjs')) rmSync(join(destination, file));
}
for (const file of readdirSync(source, { recursive: true })) {
  if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
  const code = stripTypeScriptTypes(readFileSync(join(source, file), 'utf8'), {
    mode: 'transform',
  }).replace(/(from\s+["'][^"']+)\.ts(["'])/g, '$1.mjs$2');
  const target = join(destination, file.replace(/\.ts$/, '.mjs'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
}
cpSync(join(upstream, 'LICENSE'), join(destination, 'LICENSE'));
NODE
```

Update this revision, review the generated diff and rule list, and run
`pnpm test:unit`, `pnpm lint`, and `pnpm test`. Update the exact Oxlint version in
both the root `package.json` and `src/packages.mjs` together. Generated apps own
their copied plugin and can adapt the rules to their team's standards.
