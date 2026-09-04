import type { ExecFileSyncOptions } from "node:child_process";
import { packageJsonSchema } from "../src/package-json.ts";
import type { Framework, ProjectOptions } from "../src/types.ts";
import { claudeSettingsSchema } from "./helpers/config.ts";
/**
 * E2E tests: scaffold Next.js and Expo projects non-interactively.
 *
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
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { after, describe, it } from "node:test";
import { formatProject } from "../src/format.ts";
import {
  GIT_INITIALIZATION_STATUS,
  INITIAL_COMMIT_MESSAGE,
  initializeGitRepository,
} from "../src/git.ts";
import { applyOverlay } from "../src/overlay.ts";
import { OXLINT_VERSION, setupPackages } from "../src/packages.ts";
import { generateReadme } from "../src/readme.ts";
import { installRnr } from "../src/rnr.ts";
import { scaffold } from "../src/scaffold.ts";
import { installShadcn } from "../src/shadcn.ts";
import { initSupabase } from "../src/supabase.ts";
import { projectDir } from "../src/utils.ts";
import { assertAgentGuidance } from "./helpers/agent-guidance.ts";

// Prevent npx from prompting "Ok to proceed?" when installing packages
process.env.npm_config_yes = "true";

// Expo's nested-repository Git prompt does not honor --yes; keep local runs headless.
process.env.CI = "1";

// Test runs must not race on Supabase's shared telemetry file.
process.env.SUPABASE_TELEMETRY_DISABLED = "1";

const SKIP_DIRS = new Set(["node_modules", ".next", ".expo", ".git"]);

function walkFiles(dir: string): string[] {
  const results: string[] = [];
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

function assertGeneratedGitIgnoreProtectsLocalFiles(
  targetDir: string,
  options: ProjectOptions,
) {
  const gitignore = readFileSync(join(targetDir, ".gitignore"), "utf-8")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");

  assert.match(gitignore, /(^|\n)node_modules\/?(\n|$)/);
  assert.match(gitignore, /(^|\n)\/\.env(\n|$)/);
  assert.match(gitignore, /(^|\n)\/\.env\.\*(\n|$)/);
  assert.match(gitignore, /(^|\n)!\/\.env\.example(\n|$)/);
  assert.match(gitignore, /(^|\n)!\/\.env\.\*\.example(\n|$)/);
  assert.match(gitignore, /(^|\n)\.claude\/worktrees\/?(\n|$)/);
  assert.match(gitignore, /(^|\n)\.claude\/settings\.local\.json(\n|$)/);

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

function assertGeneratedWorktreeIncludeCopiesLocalFiles(targetDir: string) {
  const worktreeincludePath = join(targetDir, ".worktreeinclude");
  assert.ok(existsSync(worktreeincludePath), ".worktreeinclude should exist");

  const worktreeinclude = readFileSync(worktreeincludePath, "utf-8")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");

  assert.match(worktreeinclude, /(^|\n)\/\.env(\n|$)/);
  assert.match(worktreeinclude, /(^|\n)\/\.env\.local(\n|$)/);
  assert.match(worktreeinclude, /(^|\n)\/\.env\.\*(\n|$)/);
  assert.match(
    worktreeinclude,
    /(^|\n)\/\.claude\/settings\.local\.json(\n|$)/,
  );
}

function copyGeneratedAppForGitAssertion(sourceDir: string) {
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

function runGitWithTestIdentity(
  cmd: string,
  args: string[],
  opts: Omit<ExecFileSyncOptions, "encoding">,
) {
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

interface ScaffoldCase {
  label: string;
  options: ProjectOptions;
}

const cases: ScaffoldCase[] = [
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

// Each scaffold gets its own budget for registry downloads and package installs.
const CASE_TIMEOUT = 300_000;

// Group cases by framework for readable output. Keep nested scaffold, build,
// and lint processes sequential for stable Node test-runner output.
const frameworkGroups: Record<Framework, ScaffoldCase[]> = {
  nextjs: [],
  expo: [],
};
for (const c of cases) {
  const fw = c.options.framework;
  if (!frameworkGroups[fw]) frameworkGroups[fw] = [];
  frameworkGroups[fw].push(c);
}

describe(
  "e2e scaffolding",
  { concurrency: 1, timeout: CASE_TIMEOUT * cases.length },
  () => {
    for (const [framework, group] of Object.entries(frameworkGroups)) {
      describe(framework, { concurrency: 1 }, () => {
        for (const { label, options } of group) {
          describe(label, { concurrency: 1, timeout: CASE_TIMEOUT }, () => {
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

            it("shares complete agent guidance and Claude's import", () => {
              assertAgentGuidance(targetDir, options.supabase);
              assert.ok(existsSync(join(targetDir, "tools", "verify.ts")));
              const settings = claudeSettingsSchema.parse(
                JSON.parse(
                  readFileSync(
                    join(targetDir, ".claude", "settings.json"),
                    "utf-8",
                  ),
                ),
              );
              assert.equal(
                settings.hooks.Stop[0].hooks[0].command,
                "sh .claude/hooks/stop-checks.sh",
              );
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
              const pkg = packageJsonSchema.parse(
                JSON.parse(
                  readFileSync(join(targetDir, "package.json"), "utf-8"),
                ),
              );
              assert.equal(pkg.devDependencies?.oxlint, OXLINT_VERSION);
              assert.equal(pkg.scripts.verify, "tsx tools/verify.ts");
              assert.equal(
                pkg.devDependencies?.["@oxlint/plugins"],
                OXLINT_VERSION,
              );
              assert.ok(existsSync(join(targetDir, ".oxlintrc.json")));
              assert.ok(
                existsSync(join(targetDir, "tools/oxlint/anti-slop/index.mjs")),
              );
            });

            if (options.framework === "expo") {
              it("resolves NativeWind's injected JSX runtime from the project", () => {
                const requireFromProject = createRequire(
                  join(targetDir, "package.json"),
                );

                assert.doesNotThrow(
                  () =>
                    requireFromProject.resolve(
                      "react-native-css-interop/jsx-runtime",
                    ),
                  "NativeWind's JSX runtime must be a direct dependency for pnpm and Metro",
                );
              });
            }

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

            it("includes local-only files in Claude worktrees", () => {
              assertGeneratedWorktreeIncludeCopiesLocalFiles(targetDir);
            });

            if (options.supabase && options.packageManager === "pnpm") {
              it("allows supabase postinstall in pnpm config", () => {
                const workspace = readFileSync(
                  join(targetDir, "pnpm-workspace.yaml"),
                  "utf-8",
                );
                assert.ok(
                  /allowBuilds:\n(?: {2}.+\n)* {2}supabase: true\n/.test(
                    workspace,
                  ),
                  "pnpm-workspace.yaml should have allowBuilds.supabase set to true",
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

            if (options.framework === "expo") {
              it("bundles the generated app with Metro", () => {
                const expoBin = join(targetDir, "node_modules", ".bin", "expo");
                const exportDir = mkdtempSync(
                  join(tmpdir(), "create-lumos-app-expo-export-"),
                );

                try {
                  execFileSync(
                    expoBin,
                    ["export", "--platform", "web", "--output-dir", exportDir],
                    {
                      cwd: targetDir,
                      env: {
                        ...process.env,
                        EXPO_NO_TELEMETRY: "1",
                        // The bundle test needs valid local configuration, not a live backend.
                        EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
                        EXPO_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
                      },
                      stdio: "pipe",
                      shell: process.platform === "win32",
                    },
                  );
                } catch (err) {
                  const output = [
                    err instanceof Error && "stdout" in err
                      ? String(err.stdout)
                      : "",
                    err instanceof Error && "stderr" in err
                      ? String(err.stderr)
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n");
                  assert.fail(`Expo Metro bundle failed:\n${output}`);
                } finally {
                  rmSync(exportDir, { recursive: true, force: true });
                }
              });
            }

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
              try {
                execFileSync(options.packageManager, ["run", "typecheck"], {
                  cwd: targetDir,
                  stdio: "pipe",
                  shell: process.platform === "win32",
                });
              } catch (err) {
                assert.fail(
                  `Generated typecheck script failed:\n${(err instanceof Error && "stdout" in err ? String(err.stdout) : "") || (err instanceof Error && "stderr" in err ? String(err.stderr) : "")}`,
                );
              }
            });

            it("passes the generated Biome and anti-slop lint script", () => {
              // Isolate Oxlint from the parent repo's test-*-e2e gitignore entry.
              execFileSync("git", ["init", "--quiet"], { cwd: targetDir });
              try {
                execFileSync(options.packageManager, ["run", "lint"], {
                  cwd: targetDir,
                  stdio: "pipe",
                  shell: process.platform === "win32",
                });
              } catch (err) {
                const output = [
                  err instanceof Error && "stdout" in err
                    ? String(err.stdout)
                    : "",
                  err instanceof Error && "stderr" in err
                    ? String(err.stderr)
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n");
                assert.fail(`lint failed:\n${output}`);
              }
            });
          });
        }
      });
    }
  },
);
