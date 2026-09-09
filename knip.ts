import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // These programs are launched by subprocesses or harness configuration.
  entry: [
    "scripts/dev/create.ts",
    "templates/shared/tools/agent-stop.ts",
    "vendor/anti-slop/index.ts",
    "scripts/oxlint/index.ts",
  ],
  project: [
    "bin/**/*.ts",
    "src/**/*.ts",
    "scripts/**/*.ts",
    "test/**/*.ts",
    "templates/shared/tools/**/*.ts",
  ],
};

export default config;
