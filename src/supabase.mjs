import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Run `supabase init` inside the scaffolded project.
 * Uses npx to resolve the locally installed `supabase` dev dependency
 * (installed via packages.mjs) so no platform-specific CLI installation is needed.
 * Creates the `supabase/` directory with config.toml and seed.sql.
 */
export async function initSupabase(projectPath) {
  const s = p.spinner();
  s.start("Initializing Supabase project…");

  try {
    await run("npx", ["supabase", "init"], { cwd: projectPath });
    s.stop("Supabase initialized");
  } catch (err) {
    s.stop("Supabase init failed");
    p.log.warn(
      `supabase init failed — you can run it manually later:\n  cd ${projectPath} && npx supabase init\n\n${err.message}`,
    );
  }
}
