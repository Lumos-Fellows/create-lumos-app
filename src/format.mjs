import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

export function biomeWriteCommand(packageManager) {
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
  projectPath,
  options,
  { runner = run } = {},
) {
  const { command, args } = biomeWriteCommand(options.packageManager);
  const s = p.spinner();
  s.start("Formatting project…");
  await runner(command, args, {
    cwd: projectPath,
  });
  s.stop("Project formatted");
}
