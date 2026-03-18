/**
 * E2E tests: scaffold Next.js and Expo projects non-interactively.
 *
 * Usage: node --test test/e2e.test.mjs
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { applyOverlay } from "../src/overlay.mjs";
import { setupPackages } from "../src/packages.mjs";
import { generateReadme } from "../src/readme.mjs";
import { scaffold } from "../src/scaffold.mjs";
import { installShadcn } from "../src/shadcn.mjs";
import { projectDir } from "../src/utils.mjs";

// Prevent npx from prompting "Ok to proceed?" when installing packages
process.env.npm_config_yes = "true";

// ── test cases ───────────────────────────────────────────────────────────────

const cases = [
  {
    label: "Next.js + Supabase + shadcn",
    options: {
      name: "test-nextjs-e2e",
      framework: "nextjs",
      packageManager: "pnpm",
      shadcn: true,
      supabase: true,
      posthog: false,
      sentry: false,
      skills: false,
    },
  },
  {
    label: "Next.js + Supabase (no shadcn)",
    options: {
      name: "test-nextjs-noshadcn-e2e",
      framework: "nextjs",
      packageManager: "pnpm",
      shadcn: false,
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
      shadcn: false,
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

        it("does not include eslint config", () => {
          assert.ok(
            !existsSync(join(targetDir, "eslint.config.mjs")),
            "eslint.config.mjs should not exist (we use Biome)",
          );
          assert.ok(
            !existsSync(join(targetDir, ".eslintrc.json")),
            ".eslintrc.json should not exist (we use Biome)",
          );
        });

        it("uses non-deprecated Biome VS Code settings", () => {
          const vscodePath = join(targetDir, ".vscode", "settings.json");
          if (existsSync(vscodePath)) {
            const content = readFileSync(vscodePath, "utf-8");
            assert.ok(
              !content.includes("quickfix.biome"),
              "should not use deprecated quickfix.biome",
            );
            assert.ok(
              content.includes("source.fixAll.biome"),
              "should use source.fixAll.biome instead",
            );
          }
        });

        it("installs packages", async () => {
          await setupPackages(targetDir, options);
          assert.ok(
            existsSync(join(targetDir, "node_modules")),
            "node_modules should exist",
          );
        });

        if (options.shadcn) {
          it("installs shadcn/ui components", async () => {
            await installShadcn(targetDir);
            assert.ok(
              existsSync(join(targetDir, "components.json")),
              "components.json should exist when shadcn is enabled",
            );
            assert.ok(
              existsSync(
                join(targetDir, "src", "components", "ui", "button.tsx"),
              ),
              "button.tsx should exist when shadcn is enabled",
            );
          });
        }

        if (options.framework === "nextjs" && !options.shadcn) {
          it("does not include shadcn artifacts", () => {
            assert.ok(
              !existsSync(join(targetDir, "components.json")),
              "components.json should not exist when shadcn is disabled",
            );
            assert.ok(
              !existsSync(
                join(targetDir, "src", "components", "ui", "button.tsx"),
              ),
              "button.tsx should not exist when shadcn is disabled",
            );
          });
        }

        it("creates .env.local instead of .env.example", () => {
          assert.ok(
            existsSync(join(targetDir, ".env.local")),
            ".env.local should exist",
          );
          assert.ok(
            !existsSync(join(targetDir, ".env.example")),
            ".env.example should not exist",
          );
        });

        it("generates README", () => {
          generateReadme(targetDir, options);
          assert.ok(
            existsSync(join(targetDir, "README.md")),
            "README.md should exist",
          );
          const readme = readFileSync(join(targetDir, "README.md"), "utf-8");
          assert.ok(
            !readme.includes("cp .env.example"),
            "README should not reference .env.example",
          );
        });
      });
    }
  },
);
