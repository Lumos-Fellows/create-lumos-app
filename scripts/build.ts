import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

rmSync("dist", { recursive: true, force: true });
for (const config of ["tsconfig.build.json", "tsconfig.anti-slop.json"]) {
  const result = spawnSync("tsc", ["-p", config], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

chmodSync("dist/bin/cli.js", 0o755);

const pluginSource = "dist/anti-slop-build";
const pluginDestination = "templates/shared/tools/oxlint/anti-slop";
for (const file of readdirSync(pluginDestination, {
  recursive: true,
  encoding: "utf-8",
})) {
  if (file.endsWith(".mjs")) rmSync(join(pluginDestination, file));
}
for (const file of readdirSync(pluginSource, {
  recursive: true,
  encoding: "utf-8",
})) {
  if (!file.endsWith(".js")) continue;
  const code = readFileSync(join(pluginSource, file), "utf-8").replace(
    /(from\s+["'][^"']+)\.js(["'])/g,
    "$1.mjs$2",
  );
  const target = join(pluginDestination, file.replace(/\.js$/, ".mjs"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
}
cpSync("vendor/anti-slop/LICENSE", join(pluginDestination, "LICENSE"));
rmSync(pluginSource, { recursive: true });
cpSync("templates", "dist/templates", { recursive: true });
