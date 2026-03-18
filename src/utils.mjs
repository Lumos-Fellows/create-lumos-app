import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Run a command synchronously and return stdout.
 */
export function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts }).trim();
}

/**
 * Run a command with inherited stdio (shows output to user).
 * Returns a promise that resolves when the process exits.
 */
export function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

/**
 * Read and parse a JSON file.
 */
export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * Write an object as formatted JSON.
 */
export function writeJson(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

/**
 * Detect which package manager is available, preferring the user's choice.
 */
export function detectPackageManager() {
  try {
    exec("pnpm --version");
    return "pnpm";
  } catch {
    return "npm";
  }
}

/**
 * Validate a project name: lowercase, alphanumeric, hyphens only.
 */
export function validateProjectName(name) {
  if (!name) return "Project name is required";
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    return "Name must be lowercase, alphanumeric, and hyphens only (must start with letter or number)";
  return undefined;
}

/**
 * Resolve the full path for the new project.
 */
export function projectDir(name) {
  return join(process.cwd(), name);
}

/**
 * Get the templates directory (relative to this file).
 */
export function templatesDir() {
  return new URL("../templates", import.meta.url).pathname;
}
