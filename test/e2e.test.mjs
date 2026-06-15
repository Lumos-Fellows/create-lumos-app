/**
 * E2E tests: scaffold Next.js and Expo projects non-interactively.
 *
 * Usage: node --test test/e2e.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { after, describe, it } from "node:test";
import { formatProject } from "../src/format.mjs";
import {
  GIT_INITIALIZATION_STATUS,
  INITIAL_COMMIT_MESSAGE,
  initializeGitRepository,
} from "../src/git.mjs";
import { applyOverlay } from "../src/overlay.mjs";
import { setupPackages } from "../src/packages.mjs";
import { generateReadme } from "../src/readme.mjs";
import { installRnr } from "../src/rnr.mjs";
import { scaffold } from "../src/scaffold.mjs";
import { installShadcn } from "../src/shadcn.mjs";
import { initSupabase } from "../src/supabase.mjs";
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

function assertGeneratedGitIgnoreProtectsLocalFiles(targetDir, options) {
  const gitignore = readFileSync(join(targetDir, ".gitignore"), "utf-8")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");

  assert.match(gitignore, /(^|\n)node_modules\/?(\n|$)/);
  assert.match(gitignore, /(^|\n)\.env\*(?:\.local)?(\n|$)/);

  if (options.framework === "nextjs") {
    assert.match(gitignore, /(^|\n)\.next\/?(\n|$)/);
  } else {
    assert.match(gitignore, /(^|\n)\.expo\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)dist\/?(\n|$)/);
  }

  if (options.supabase) {
    assert.match(gitignore, /(^|\n)supabase\/\.temp\/?(\n|$)/);
  }
}

function copyGeneratedAppForGitAssertion(sourceDir) {
  const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-e2e-git-"));

  cpSync(sourceDir, projectPath, {
    recursive: true,
    filter: (src) => {
      const rel = relative(sourceDir, src);
      const topLevel = rel.split(sep)[0];
      return !["node_modules", ".next", ".expo", ".git"].includes(topLevel);
    },
  });

  mkdirSync(join(projectPath, "node_modules"), { recursive: true });
  mkdirSync(join(projectPath, ".next"), { recursive: true });
  mkdirSync(join(projectPath, "supabase", ".temp"), { recursive: true });
  writeFileSync(join(projectPath, "node_modules", "ignored.js"), "ignored\n");
  writeFileSync(join(projectPath, ".next", "ignored"), "ignored\n");
  writeFileSync(join(projectPath, "supabase", ".temp", "ignored"), "ignored\n");

  return projectPath;
}

function runGitWithTestIdentity(cmd, args, opts) {
  return execFileSync(cmd, args, {
    ...opts,
    encoding: "utf-8",
    stdio: "pipe",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "create-lumos-app tests",
      GIT_AUTHOR_EMAIL: "tests@example.com",
      GIT_COMMITTER_NAME: "create-lumos-app tests",
      GIT_COMMITTER_EMAIL: "tests@example.com",
    },
  });
}

// ── test cases ───────────────────────────────────────────────────────────────

const cases = [
  {
    label: "Next.js (no integrations)",
    options: {
      name: "test-nextjs-bare-e2e",
      framework: "nextjs",
      template: "bare",
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
      template: "bare",
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
    label: "Next.js + notes-app template",
    options: {
      name: "test-nextjs-notes-e2e",
      framework: "nextjs",
      template: "notes-app",
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
    label: "Expo (no integrations)",
    options: {
      name: "test-expo-bare-e2e",
      framework: "expo",
      template: "bare",
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
      template: "bare",
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
              assert.ok(
                existsSync(targetDir),
                "project directory should exist",
              );
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
              const codeExts = [".ts", ".tsx", ".js", ".jsx", ".css", ".md"];
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

            it("ignores local-only generated project files", () => {
              assertGeneratedGitIgnoreProtectsLocalFiles(targetDir, options);
            });

            if (options.supabase && options.packageManager === "pnpm") {
              it("allows supabase postinstall in pnpm config", () => {
                const pkg = JSON.parse(
                  readFileSync(join(targetDir, "package.json"), "utf-8"),
                );
                assert.ok(
                  pkg.pnpm?.onlyBuiltDependencies?.includes("supabase"),
                  "package.json should have pnpm.onlyBuiltDependencies including supabase",
                );
              });
            }

            if (options.supabase) {
              it("has supabase CLI available", () => {
                const result = execFileSync("npx", ["supabase", "--version"], {
                  cwd: targetDir,
                  encoding: "utf-8",
                  stdio: "pipe",
                  shell: process.platform === "win32",
                }).trim();
                assert.ok(
                  /^\d+\.\d+\.\d+/.test(result),
                  `supabase --version should return a semver version, got: ${result}`,
                );
              });

              it("initializes Supabase project", async () => {
                await initSupabase(targetDir);
                assert.ok(
                  existsSync(join(targetDir, "supabase", "config.toml")),
                  "supabase/config.toml should exist after supabase init",
                );
              });

              it("ignores Supabase temp files", () => {
                const gitignore = readFileSync(
                  join(targetDir, "supabase", ".gitignore"),
                  "utf-8",
                );
                assert.match(gitignore, /(^|\n)\.temp(?:\/)?(\n|$)/);
              });
            }

            if (!options.supabase) {
              it("does not include supabase directory", () => {
                assert.ok(
                  !existsSync(join(targetDir, "supabase", "config.toml")),
                  "supabase/config.toml should not exist when supabase is disabled",
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

            if (options.template === "notes-app") {
              it("includes notes-app template files", () => {
                assert.ok(
                  existsSync(
                    join(targetDir, "src", "components", "navbar.tsx"),
                  ),
                  "navbar.tsx should exist for notes-app template",
                );
                assert.ok(
                  existsSync(
                    join(targetDir, "src", "app", "notes", "page.tsx"),
                  ),
                  "notes/page.tsx should exist for notes-app template",
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
              const readme = readFileSync(
                join(targetDir, "README.md"),
                "utf-8",
              );
              assert.ok(
                !readme.includes("cp .env.example"),
                "README should not reference .env.example",
              );
            });

            it("formats generated files", async () => {
              await formatProject(targetDir, options);
            });

            if (
              options.framework === "nextjs" &&
              options.template === "notes-app"
            ) {
              it("creates a clean final Git commit with generated notes-app files", async () => {
                const gitProjectPath =
                  copyGeneratedAppForGitAssertion(targetDir);
                try {
                  const initialized = await initializeGitRepository(
                    gitProjectPath,
                    { runner: runGitWithTestIdentity },
                  );

                  assert.equal(
                    initialized,
                    GIT_INITIALIZATION_STATUS.COMMITTED,
                  );
                  assert.equal(
                    execFileSync("git", ["status", "--short"], {
                      cwd: gitProjectPath,
                      encoding: "utf-8",
                    }),
                    "",
                  );

                  const head = execFileSync(
                    "git",
                    ["show", "--name-only", "--oneline", "HEAD"],
                    {
                      cwd: gitProjectPath,
                      encoding: "utf-8",
                    },
                  );
                  assert.ok(head.includes(INITIAL_COMMIT_MESSAGE));
                  assert.ok(head.includes("src/app/notes/page.tsx"));
                  assert.ok(head.includes("src/components/navbar.tsx"));
                  assert.ok(
                    !head.includes("Initial commit from Create Next App"),
                  );
                  assert.ok(!head.includes(".env.local"));
                  assert.ok(!head.includes("node_modules"));
                  assert.ok(!head.includes(".next"));
                  assert.ok(!head.includes("supabase/.temp"));
                } finally {
                  rmSync(gitProjectPath, { recursive: true, force: true });
                }
              });
            }

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

            it("passes Biome check", () => {
              const biomeBin = join(targetDir, "node_modules", ".bin", "biome");
              try {
                execFileSync(biomeBin, ["check", "."], {
                  cwd: targetDir,
                  stdio: "pipe",
                  shell: process.platform === "win32",
                });
              } catch (err) {
                const output = [err.stdout?.toString(), err.stderr?.toString()]
                  .filter(Boolean)
                  .join("\n");
                assert.fail(`biome check failed:\n${output}`);
              }
            });
          });
        }
      });
    }
  },
);
