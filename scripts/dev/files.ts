import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const hidden = new Set([
  "node_modules",
  ".git",
  ".next",
  ".expo",
  "dist",
  ".DS_Store",
]);

// Reject each symlink component, including the workspace itself, before reading.
export function workspacePath(root: string, relative: string) {
  if (lstatSync(root).isSymbolicLink())
    throw new Error("The playground must be a real directory.");
  let target = root;
  for (const part of relative === "" ? [] : relative.split("/")) {
    if (
      !part ||
      part === "." ||
      part === ".." ||
      part.includes("\\") ||
      part.includes(":") ||
      hidden.has(part)
    ) {
      throw new Error("This path is not available in the file browser.");
    }
    target = join(target, part);
    if (lstatSync(target).isSymbolicLink())
      throw new Error("Symbolic links are not shown.");
  }
  return target;
}

export function listFiles(root: string, relative: string) {
  return readdirSync(workspacePath(root, relative), { withFileTypes: true })
    .filter((entry) => !hidden.has(entry.name) && !entry.isSymbolicLink())
    .map((entry) => ({ name: entry.name, directory: entry.isDirectory() }))
    .sort(
      (a, b) =>
        Number(b.directory) - Number(a.directory) ||
        a.name.localeCompare(b.name),
    );
}

export function readFile(root: string, relative: string) {
  const target = workspacePath(root, relative);
  const stats = lstatSync(target);
  if (!stats.isFile() || stats.size > 512_000)
    throw new Error("Preview supports text files up to 512 KB.");
  const content = readFileSync(target);
  if (content.includes(0)) throw new Error("Binary files cannot be previewed.");
  return content.toString("utf8");
}
