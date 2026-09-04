import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
const result = spawnSync("tsc", ["-p", "tsconfig.build.json"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
chmodSync("dist/bin/cli.js", 0o755);
cpSync("templates", "dist/templates", { recursive: true });
