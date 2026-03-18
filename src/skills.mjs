import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Optionally run `npx skills add` for recommended developer skills.
 */
export async function installSkills(projectPath) {
  const s = p.spinner();
  s.start("Installing developer skills via skills.sh…");

  try {
    await run("npx", ["skills", "add"], { cwd: projectPath });
    s.stop("Developer skills installed");
  } catch {
    s.stop("Skills installation skipped (not available or failed)");
  }
}
