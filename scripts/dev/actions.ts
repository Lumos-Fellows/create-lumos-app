import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, lstatSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { commandName, projectName } from "./contracts.ts";
import { workspacePath } from "./files.ts";

const manifestSchema = z.object({
  scripts: z.record(z.string(), z.string()).default({}),
  packageManager: z.string().optional(),
});

export function projectCommands(workspace: string, name: string) {
  const directory = workspacePath(workspace, projectName.parse(name));
  const manifest = manifestSchema.parse(
    JSON.parse(
      readFileSync(workspacePath(workspace, `${name}/package.json`), "utf8"),
    ),
  );
  const manager =
    manifest.packageManager?.startsWith("pnpm@") ||
    existsSync(join(directory, "pnpm-lock.yaml"))
      ? "pnpm"
      : "npm";
  const commands = commandName.options.filter(
    (command) => manifest.scripts[command],
  );
  return { directory, manager, commands };
}

export function deleteProject(workspace: string, name: string) {
  const directory = workspacePath(workspace, projectName.parse(name));
  if (!lstatSync(directory).isDirectory())
    throw new Error("Select a project directory.");
  rmSync(directory, { recursive: true });
}

// Package scripts spawn descendants; stopping only the package manager leaves servers alive.
export async function signalProcessTree(child: ChildProcess, force = false) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await once(killer, "close");
    return;
  }
  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH"))
      throw error;
  }
}
