import type { KnipConfig } from "knip";

const config: KnipConfig = {
  project: ["**/*.{ts,tsx,js,mjs,cjs,css}", "!.agents/**", "!.claude/**", "!.codex/**", "!tools/oxlint/**"],
  entry: [
    "tools/agent-stop.ts",
    // Installed UI primitives form a library for app authors.
    // -- SHADCN_START --
    "src/components/ui/**/*.{ts,tsx}",
    // -- SHADCN_END --
    // Expose the validated environment and shared styling helper to app authors.
    "src/env.ts",
    "src/lib/utils.ts",
    // -- SUPABASE_START --
    "src/lib/supabase/client.ts",
    "src/lib/supabase/server.ts",
    // -- SUPABASE_END --
  ],
  ignoreDependencies: [
    // The local database CLI is also used directly for migrations and development.
    // -- SUPABASE_START --
    "supabase",
    // -- SUPABASE_END --
  ],
};

export default config;
