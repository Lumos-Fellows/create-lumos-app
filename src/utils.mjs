import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEBUG_MODE = false;

function debug(...args) {
  if (DEBUG_MODE) console.log("[DEBUG]", ...args);
}

/**
 * Run a command synchronously and return stdout.
 */
export function exec(cmd, opts = {}) {
  debug(`exec: ${cmd}`);
  return execSync(cmd, { encoding: "utf-8", stdio: "pipe", ...opts }).trim();
}

/**
 * Run a command with piped stdio (output hidden behind spinners).
 * Captures stderr and includes it in the error on failure.
 */
export function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const spawnOpts = {
      stdio: "pipe",
      shell: process.platform === "win32",
      ...opts,
    };
    debug(`run: ${cmd} ${args.join(" ")}`);
    debug(`  cwd: ${spawnOpts.cwd || process.cwd()}`);
    debug(`  shell: ${spawnOpts.shell}`);
    const child = spawn(cmd, args, spawnOpts);
    const stderrChunks = [];
    const stdoutChunks = [];
    child.stderr?.on("data", (chunk) => {
      debug(`  stderr: ${chunk.toString().trim()}`);
      stderrChunks.push(chunk);
    });
    child.stdout?.on("data", (chunk) => {
      debug(`  stdout: ${chunk.toString().trim()}`);
      stdoutChunks.push(chunk);
    });
    child.on("close", (code) => {
      debug(`  exit code: ${code}`);
      if (code === 0) resolve();
      else {
        const stderr = Buffer.concat(stderrChunks).toString().trim();
        const stdout = Buffer.concat(stdoutChunks).toString().trim();
        const output = [stderr, stdout].filter(Boolean).join("\n");
        reject(
          new Error(
            `${cmd} exited with code ${code}${output ? `\n${output}` : ""}`,
          ),
        );
      }
    });
    child.on("error", (err) => {
      debug(`  spawn error: ${err.message}`);
      reject(err);
    });
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
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
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
  if (name === ".") return undefined;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    return 'Name must be lowercase, alphanumeric, and hyphens only (must start with letter or number), or "." to use the current directory';
  return undefined;
}

/**
 * Convert an arbitrary directory name into a valid npm package name:
 * lowercase, alphanumeric and hyphens only.
 */
export function sanitizePackageName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if the name means "use the current directory".
 */
export function isCurrentDir(name) {
  return name === ".";
}

/**
 * Resolve the full path for the new project.
 * "." means scaffold into the current working directory.
 */
export function projectDir(name) {
  if (isCurrentDir(name)) return process.cwd();
  return join(process.cwd(), name);
}

/**
 * Get the templates directory (relative to this file).
 */
export function templatesDir() {
  const thisFile = fileURLToPath(import.meta.url);
  return join(dirname(thisFile), "..", "templates");
}
