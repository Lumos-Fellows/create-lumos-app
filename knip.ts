import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // These programs are launched by subprocesses or harness configuration.
  entry: [
    "scripts/dev/create.ts",
    // The template exposes all UI primitives for generated app authors.
    "templates/nextjs/shadcn/src/components/ui/**/*.tsx",
    "templates/shared/tools/agent-stop.ts",
    "vendor/anti-slop/index.ts",
    "scripts/oxlint/index.ts",
  ],
  project: [
    "bin/**/*.ts",
    "src/**/*.ts",
    "scripts/**/*.{ts,tsx}",
    "templates/nextjs/shadcn/src/components/ui/**/*.tsx",
    "templates/nextjs/base/src/lib/utils.ts",
    "templates/nextjs/base/src/app/globals.css",
    "test/**/*.ts",
    "templates/shared/tools/**/*.ts",
  ],
};

export default config;
