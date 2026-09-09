/// <reference types="node" />

import { spawnSync } from "node:child_process";
import { readProject } from "./project.js";

const { scripts, packageManager } = readProject();

for (const name of ["format", "lint", "typecheck", "knip", "test:unit", "test"]) {
  if (!scripts[name]) continue;
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
