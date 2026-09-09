import { spawnSync } from "node:child_process";
import { readProject } from "./project.js";

const { scripts, packageManager } = readProject();
if (!scripts.verify)
  throw new Error(
    "Add a verify script to package.json before running hook checks.",
  );

const result = spawnSync(packageManager, ["run", "verify"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
