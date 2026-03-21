import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Run `supabase init` inside the scaffolded project.
 * Uses `npx supabase@latest` to download and run the CLI ephemerally —
 * the supabase npm package requires a postinstall script to fetch the
 * platform binary, which pnpm blocks by default, so installing it as
 * a dev dependency is unreliable.
 * Creates the `supabase/` directory with config.toml and seed.sql.
 */
export async function initSupabase(projectPath) {
  const s = p.spinner();
  s.start("Initializing Supabase project…");

  try {
    await run("npx", ["supabase@latest", "init"], { cwd: projectPath });
    s.stop("Supabase initialized");
  } catch (err) {
    s.stop("Supabase init failed");
    p.log.warn(
      `supabase init failed — you can run it manually later:\n  cd ${projectPath} && npx supabase init\n\n${err.message}`,
    );
  }
}
