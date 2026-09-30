import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const manifest = z.object({
  packageManager: z
    .string()
    .regex(/^(npm|pnpm)@/)
    .optional(),
  scripts: z.record(z.string(), z.string()).default({}),
});

export function readProject() {
  const pkg = manifest.parse(JSON.parse(readFileSync("package.json", "utf8")));
  const useNpm = pkg.packageManager
    ? pkg.packageManager.startsWith("npm@")
    : existsSync("package-lock.json");
  return { scripts: pkg.scripts, packageManager: useNpm ? "npm" : "pnpm" };
}
