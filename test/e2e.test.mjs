/**
 * E2E tests: scaffold Next.js and Expo projects non-interactively.
 *
 * Usage: node --test test/e2e.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { applyOverlay } from "../src/overlay.mjs";
import { setupPackages } from "../src/packages.mjs";
import { generateReadme } from "../src/readme.mjs";
import { installRnr } from "../src/rnr.mjs";
import { scaffold } from "../src/scaffold.mjs";
import { installShadcn } from "../src/shadcn.mjs";
import { projectDir } from "../src/utils.mjs";

// Prevent npx from prompting "Ok to proceed?" when installing packages
process.env.npm_config_yes = "true";

const SKIP_DIRS = new Set(["node_modules", ".next", ".expo", ".git"]);

function walkFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

// ── test cases ───────────────────────────────────────────────────────────────

const cases = [
  {
    label: "Next.js (no integrations)",
    options: {
      name: "test-nextjs-bare-e2e",
      framework: "nextjs",
      packageManager: "pnpm",
      shadcn: false,
      rnr: false,
      supabase: false,
      posthog: false,
      sentry: false,
      skills: false,
    },
  },
  {
    label: "Next.js + all integrations",
    options: {
      name: "test-nextjs-all-e2e",
      framework: "nextjs",
      packageManager: "pnpm",
      shadcn: true,
      rnr: false,
      supabase: true,
      posthog: true,
      sentry: true,
      skills: false,
    },
  },
  {
    label: "Expo (no integrations)",
    options: {
      name: "test-expo-bare-e2e",
      framework: "expo",
      packageManager: "pnpm",
      shadcn: false,
      rnr: false,
      supabase: false,
      posthog: false,
      sentry: false,
      skills: false,
    },
  },
  {
    label: "Expo + all integrations + RNR",
    options: {
      name: "test-expo-all-e2e",
      framework: "expo",
      packageManager: "pnpm",
      shadcn: false,
      rnr: true,
      supabase: true,
      posthog: true,
      sentry: true,
      skills: false,
    },
  },
];

// ── tests ────────────────────────────────────────────────────────────────────

const TEST_TIMEOUT = 300_000;

// Group cases by framework so same-framework tests run sequentially
// (they share the same npx cache and race on it), while different
// frameworks run in parallel.
const frameworkGroups = {};
for (const c of cases) {
  const fw = c.options.framework;
  if (!frameworkGroups[fw]) frameworkGroups[fw] = [];
  frameworkGroups[fw].push(c);
}

describe(
  "e2e scaffolding",
  { concurrency: Object.keys(frameworkGroups).length, timeout: TEST_TIMEOUT },
  () => {
    for (const [framework, group] of Object.entries(frameworkGroups)) {
      describe(framework, { concurrency: 1 }, () => {
        for (const { label, options } of group) {
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

        it("has no residual conditional markers", () => {
          const files = walkFiles(targetDir);
          const codeExts = [".ts", ".tsx", ".js", ".jsx", ".css"];
          const residual = [];
          for (const file of files) {
            if (!codeExts.some((ext) => file.endsWith(ext))) continue;
            const content = readFileSync(file, "utf-8");
            if (/--\s+[A-Z_]+_(START|END)\s+--/.test(content)) {
              residual.push(file.slice(targetDir.length + 1));
            }
          }
          assert.deepStrictEqual(
            residual,
            [],
            `Residual conditional markers found in:\n  ${residual.join("\n  ")}`,
          );
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

        if (options.packageManager === "pnpm") {
          it("has only pnpm-lock.yaml (no package-lock.json)", () => {
            assert.ok(
              existsSync(join(targetDir, "pnpm-lock.yaml")),
              "pnpm-lock.yaml should exist",
            );
            assert.ok(
              !existsSync(join(targetDir, "package-lock.json")),
              "package-lock.json should not exist when using pnpm",
            );
          });
        } else {
          it("has only package-lock.json (no pnpm-lock.yaml)", () => {
            assert.ok(
              existsSync(join(targetDir, "package-lock.json")),
              "package-lock.json should exist",
            );
            assert.ok(
              !existsSync(join(targetDir, "pnpm-lock.yaml")),
              "pnpm-lock.yaml should not exist when using npm",
            );
          });
        }

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

        if (options.rnr) {
          it("installs React Native Reusables components", async () => {
            await installRnr(targetDir);
            assert.ok(
              existsSync(join(targetDir, "components.json")),
              "components.json should exist when RNR is enabled",
            );
            assert.ok(
              existsSync(join(targetDir, "components", "ui", "button.tsx")),
              "button.tsx should exist when RNR is enabled",
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

        it("passes TypeScript type check", () => {
          const tscBin = join(targetDir, "node_modules", ".bin", "tsc");
          try {
            execFileSync(tscBin, ["--noEmit"], {
              cwd: targetDir,
              stdio: "pipe",
              shell: process.platform === "win32",
            });
          } catch (err) {
            assert.fail(
              `tsc --noEmit failed:\n${err.stdout?.toString() || err.stderr?.toString()}`,
            );
          }
        });

        it("passes Biome lint", () => {
          const biomeBin = join(targetDir, "node_modules", ".bin", "biome");
          try {
            // Use "lint" not "check" — formatting diffs from conditional
            // stripping are expected and auto-fixable, but lint errors are real.
            execFileSync(biomeBin, ["lint", "."], {
              cwd: targetDir,
              stdio: "pipe",
              shell: process.platform === "win32",
            });
          } catch (err) {
            assert.fail(
              `biome lint failed:\n${err.stdout?.toString() || err.stderr?.toString()}`,
            );
          }
        });
        });
      }
      });
    }
  },
);
