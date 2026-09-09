import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const configSchema = z
  .object({ exclude: z.array(z.string()).default([]) })
  .passthrough();

export function configureTypecheck(projectPath: string) {
  const path = join(projectPath, "tsconfig.json");
  if (!existsSync(path)) return;
  const config = configSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  // Skills are installed independently and can contain third-party tooling.
  config.exclude = [
    ...new Set([
      ...config.exclude,
      ".agents/skills",
      ".claude/skills",
      ".codex/skills",
      ".claude/worktrees",
      "tools/oxlint",
      "out",
      "web-build",
      ".vercel",
    ]),
  ];
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}
