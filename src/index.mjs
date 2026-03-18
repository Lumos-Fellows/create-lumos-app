import { existsSync } from "node:fs";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { applyOverlay } from "./overlay.mjs";
import { setupPackages } from "./packages.mjs";
import { gatherOptions } from "./prompts.mjs";
import { generateReadme } from "./readme.mjs";
import { scaffold } from "./scaffold.mjs";
import { installSkills } from "./skills.mjs";
import { printSuccess } from "./success.mjs";
import { isCurrentDir, projectDir } from "./utils.mjs";

export async function main(args) {
  try {
    // 1. Gather user options
    const options = await gatherOptions(args);

    const targetDir = projectDir(options.name);

    // Check if directory already exists (skip for "." — user intends to use cwd)
    if (!isCurrentDir(options.name) && existsSync(targetDir)) {
      p.log.error(
        `Directory ${pc.red(options.name)} already exists. Pick a different name or remove it first.`,
      );
      process.exit(1);
    }

    // 2. Scaffold base project
    await scaffold(options);

    // 3. Apply template overlays and strip conditionals
    const s = p.spinner();
    s.start("Applying Lumos templates…");
    applyOverlay(targetDir, options);
    s.stop("Templates applied");

    // 4. Modify package.json, install deps, assemble .env
    await setupPackages(targetDir, options);

    // 5. Install developer skills (if opted in)
    if (options.skills) {
      await installSkills(targetDir);
    }

    // 6. Generate README
    generateReadme(targetDir, options);
    p.log.success("README.md generated");

    // 7. Print success
    printSuccess(options);
  } catch (err) {
    p.log.error(err.message);
    process.exit(1);
  }
}
