import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const pluginSource = "dist/anti-slop-build";
const pluginDestination = "templates/shared/tools/oxlint";
rmSync(pluginSource, { recursive: true, force: true });
const result = spawnSync("tsc", ["-p", "tsconfig.anti-slop.json"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

rmSync(pluginDestination, { recursive: true, force: true });
mkdirSync(pluginDestination, { recursive: true });
for (const file of readdirSync(pluginSource, {
  recursive: true,
  encoding: "utf-8",
})) {
  if (!file.endsWith(".js")) continue;
  const outputFile = file
    .replace(/^vendor[\\/]anti-slop[\\/]/, "anti-slop/")
    .replace(/^scripts[\\/]oxlint[\\/]/, "app-quality/");
  const code = readFileSync(join(pluginSource, file), "utf-8").replace(
    /(from\s+["'][^"']+)\.js(["'])/g,
    "$1.mjs$2",
  );
  const target = join(pluginDestination, outputFile.replace(/\.js$/, ".mjs"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
}
for (const file of ["LICENSE", "README.md"]) {
  cpSync(
    join("vendor/anti-slop", file),
    join(pluginDestination, "anti-slop", file),
  );
}
rmSync(pluginSource, { recursive: true });
