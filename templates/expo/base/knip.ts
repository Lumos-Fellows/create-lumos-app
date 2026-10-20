import type { KnipConfig } from "knip";

const config: KnipConfig = {
  project: ["**/*.{ts,tsx,js,mjs,cjs,css}", "!.agents/**", "!.claude/**", "!.codex/**", "!tools/oxlint/**"],
  entry: [
    "tools/agent-stop.ts",
    // Installed UI primitives form a library for app authors.
    // -- RNR_START --
    "components/ui/**/*.{ts,tsx}",
    // -- RNR_END --
    // The validated environment is an entry point for future app code.
    "env.ts",
    // -- SUPABASE_START --
    "lib/supabase.ts",
    // -- SUPABASE_END --
    // -- POSTHOG_START --
    "lib/posthog.ts",
    // -- POSTHOG_END --
  ],
  // Release commands use the separately installed EAS CLI.
  ignoreBinaries: ["eas"],
  ignoreDependencies: [
    // Knip infers OTA updates from Expo config, but this starter does not enable them.
    "expo-updates",
    // The local database CLI is also used directly for migrations and development.
    // -- SUPABASE_START --
    "supabase",
    // -- SUPABASE_END --
  ],
};

export default config;
