import * as p from "@clack/prompts";
import type { CommandRunner, PackageManager } from "./types.ts";
import { run } from "./utils.ts";

export function biomeWriteCommand(packageManager: PackageManager) {
  if (packageManager === "pnpm") {
    return {
      command: "pnpm",
      args: ["exec", "biome", "check", "--write", "."],
    };
  }

  return {
    command: "npm",
    args: ["exec", "--", "biome", "check", "--write", "."],
  };
}

/**
 * Format the generated project after all scaffolders and integrations write files.
 */
export async function formatProject(
  projectPath: string,
  options: { packageManager: PackageManager },
  { runner = run }: { runner?: CommandRunner } = {},
) {
  const { command, args } = biomeWriteCommand(options.packageManager);
  const s = p.spinner();
  s.start("Formatting project…");
  await runner(command, args, {
    cwd: projectPath,
  });
  s.stop("Project formatted");
}
