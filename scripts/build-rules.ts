import { cpSync, rmSync } from "node:fs";
import { build } from "esbuild";

const destination = "templates/shared/tools/oxlint";
rmSync(destination, { recursive: true, force: true });
await build({
  entryPoints: {
    "anti-slop/index": "vendor/anti-slop/index.ts",
    "anti-slop/effect/index": "vendor/anti-slop/effect/index.ts",
    "app-quality/index": "scripts/oxlint/index.ts",
  },
  outdir: destination,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node20",
});
for (const file of ["LICENSE", "README.md"]) {
  cpSync(`vendor/anti-slop/${file}`, `${destination}/anti-slop/${file}`);
}
