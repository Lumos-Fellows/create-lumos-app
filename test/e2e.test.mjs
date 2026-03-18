/**
 * E2E tests: scaffold Next.js and Expo projects non-interactively.
 *
 * Usage: node --test test/e2e.test.mjs
 */

import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { applyOverlay } from "../src/overlay.mjs";
import { setupPackages } from "../src/packages.mjs";
import { generateReadme } from "../src/readme.mjs";
import { scaffold } from "../src/scaffold.mjs";
import { projectDir } from "../src/utils.mjs";

// Prevent npx from prompting "Ok to proceed?" when installing packages
process.env.npm_config_yes = "true";

// ── test cases ───────────────────────────────────────────────────────────────

const cases = [
  {
    label: "Next.js + Supabase",
    options: {
      name: "test-nextjs-e2e",
      framework: "nextjs",
      packageManager: "pnpm",
      supabase: true,
      posthog: false,
      sentry: false,
      skills: false,
    },
  },
  {
    label: "Expo + Supabase",
    options: {
      name: "test-expo-e2e",
      framework: "expo",
      packageManager: "npm",
      supabase: true,
      posthog: false,
      sentry: false,
      skills: false,
    },
  },
];

// ── tests ────────────────────────────────────────────────────────────────────

const MAX_CONCURRENCY = 5;

const TEST_TIMEOUT = 120_000;

describe(
  "e2e scaffolding",
  { concurrency: MAX_CONCURRENCY, timeout: TEST_TIMEOUT },
  () => {
    for (const { label, options } of cases) {
      describe(label, { concurrency: 1 }, () => {
        const targetDir = projectDir(options.name);

        // clean slate before and after
        function cleanup() {
          if (existsSync(targetDir)) {
            rmSync(targetDir, { recursive: true, force: true });
          }
        }
        cleanup();
        after(cleanup);

        it("scaffolds the project", async () => {
          await scaffold(options);
          assert.ok(existsSync(targetDir), "project directory should exist");
          assert.ok(
            existsSync(join(targetDir, "package.json")),
            "package.json should exist",
          );
        });

        it("applies template overlays", () => {
          applyOverlay(targetDir, options);
        });

        it("installs packages", async () => {
          await setupPackages(targetDir, options);
          assert.ok(
            existsSync(join(targetDir, "node_modules")),
            "node_modules should exist",
          );
        });

        it("generates README", () => {
          generateReadme(targetDir, options);
          assert.ok(
            existsSync(join(targetDir, "README.md")),
            "README.md should exist",
          );
        });
      });
    }
  },
);
