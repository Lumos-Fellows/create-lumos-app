/// <reference types="node" />

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const pkg = z.object({
  packageManager: z.string().optional(),
  scripts: z.record(z.string(), z.string()).default({}),
}).parse(JSON.parse(readFileSync("package.json", "utf-8")));
const useNpm = pkg.packageManager
  ? pkg.packageManager.startsWith("npm@")
  : existsSync("package-lock.json");
const packageManager = useNpm ? "npm" : "pnpm";

for (const name of ["format", "lint", "typecheck", "knip", "test:unit", "test"]) {
  if (!pkg.scripts?.[name]) continue;
  const result = spawnSync(packageManager, ["run", name], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
  });
  if (result.error || result.status !== 0) {
    console.error(`[fail] ${name} FAILED`);
    if (result.error) console.error(result.error.message);
    process.exitCode = 1;
  }
}
