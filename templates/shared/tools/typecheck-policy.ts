import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const outputs = new Set([
  ".git",
  ".next",
  ".expo",
  "dist",
  "build",
  "coverage",
  "out",
  "web-build",
  ".vercel",
  "android",
  "ios",
]);
const externalPaths = [
  ".agents/skills",
  ".claude/skills",
  ".codex/skills",
  ".claude/worktrees",
  "tools/oxlint",
];
const expoJavaScript = new Set([
  "app.config.js",
  "app.config.values.js",
  "babel.config.js",
  "metro.config.js",
]);

const runtimeJavaScript = new Set(["postcss.config.mjs", ...expoJavaScript]);

export function sourceFiles(root: string, repository: boolean) {
  const files: string[] = [];
  function walk(directory: string, path: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name === "node_modules") continue;
      const relative = path ? `${path}/${entry.name}` : entry.name;
      if (!path && outputs.has(entry.name)) continue;
      if (externalPaths.includes(relative)) continue;
      if (
        repository &&
        ((!path &&
          (entry.name === ".playground" ||
            /^test-.*-e2e$/u.test(entry.name))) ||
          relative === "templates/shared/tools/oxlint")
      )
        continue;
      if (entry.isDirectory()) walk(join(directory, entry.name), relative);
      else if (/\.[cm]?[jt]sx?$/u.test(entry.name)) files.push(relative);
    }
  }
  walk(root, "");
  return files;
}

export function validateSourceFiles(
  root: string,
  files: string[],
  checked: Set<string>,
  checkedJavaScript: Set<string>,
  repository: boolean,
) {
  const errors: string[] = [];
  for (const file of files) {
    // Conditional templates are typechecked after overlaying them in scaffold tests.
    const rawTemplate = repository && /^templates\/(nextjs|expo)\//u.test(file);
    const javascript = /\.[cm]?jsx?$/u.test(file);
    if (javascript) {
      const allowed = repository
        ? file.startsWith("templates/expo/base/") &&
          expoJavaScript.has(file.slice("templates/expo/base/".length))
        : runtimeJavaScript.has(file);
      if (!allowed) errors.push(`${file}: use TypeScript for maintained code.`);
      else if (!rawTemplate && !checkedJavaScript.has(join(root, file)))
        errors.push(`${file}: runtime JavaScript must be covered by checkJs.`);
    }
    if (!rawTemplate && !checked.has(join(root, file)))
      errors.push(`${file}: not covered by a strict TypeScript project.`);
    const content = readFileSync(join(root, file), "utf8").replace(
      /^#![^\n]*\n/u,
      "",
    );
    const leadingComments =
      content.match(
        /^\s*(?:(?:\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)\s*)*/u,
      )?.[0] ?? "";
    if (/(?:\/\/|\/\*|\*)\s*@ts-nocheck\b/u.test(leadingComments))
      errors.push(`${file}: remove @ts-nocheck and fix the type errors.`);
  }
  return errors;
}
