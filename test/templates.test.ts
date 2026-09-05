import { z } from "zod";
import { claudeSettingsSchema } from "./helpers/config.ts";
/**
 * Unit tests for template file correctness.
 *
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { templatesDir } from "../src/utils.ts";

const TEMPLATES = templatesDir();
const NEXTJS_DIR = join(TEMPLATES, "nextjs");
const EXPO_DIR = join(TEMPLATES, "expo");

/** Known integration tags used in conditional marker comments. */
const KNOWN_TAGS = new Set(["SUPABASE", "POSTHOG", "SENTRY", "SHADCN", "RNR"]);

/** All valid marker names (TAG + NO_TAG variants). */
const VALID_MARKERS = new Set(
  [...KNOWN_TAGS].flatMap((tag) => [
    `${tag}_START`,
    `${tag}_END`,
    `NO_${tag}_START`,
    `NO_${tag}_END`,
  ]),
);

/**
 * Recursively list all files under a directory.
 */
function walkFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function hasGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ── Marker integrity ────────────────────────────────────────────────────────

describe("Conditional markers are well-formed", () => {
  const allFiles = walkFiles(TEMPLATES);
  const codeExts = [".ts", ".tsx", ".js", ".jsx", ".css", ".json", ".md"];
  const codeFiles = allFiles.filter((f) =>
    codeExts.some((ext) => f.endsWith(ext)),
  );

  const markerPattern = /--\s+([A-Z_]+)\s+--/g;

  for (const file of codeFiles) {
    const content = readFileSync(file, "utf-8");
    if (!content.includes("_START") && !content.includes("_END")) continue;

    const relPath = file.slice(TEMPLATES.length + 1);
    const markers = [...content.matchAll(markerPattern)].map((m) => m[1]);
    if (markers.length === 0) continue;

    it(`${relPath} uses only known marker tags`, () => {
      const unknown = markers.filter((m) => !VALID_MARKERS.has(m));
      assert.deepStrictEqual(
        unknown,
        [],
        `Unknown markers: ${unknown.join(", ")}. Valid: ${[...VALID_MARKERS].join(", ")}`,
      );
    });

    it(`${relPath} has balanced START/END pairs`, () => {
      const starts = markers.filter((m) => m.endsWith("_START"));
      const ends = markers.filter((m) => m.endsWith("_END"));
      // Extract tag names (e.g. "SUPABASE" from "SUPABASE_START")
      const startTags = starts.map((m) => m.replace("_START", ""));
      const endTags = ends.map((m) => m.replace("_END", ""));

      for (const tag of new Set(startTags)) {
        const startCount = startTags.filter((t) => t === tag).length;
        const endCount = endTags.filter((t) => t === tag).length;
        assert.equal(
          startCount,
          endCount,
          `${tag}: ${startCount} START(s) but ${endCount} END(s)`,
        );
      }

      // Check for orphaned ENDs with no START
      for (const tag of new Set(endTags)) {
        assert.ok(
          startTags.includes(tag),
          `${tag}_END found without matching ${tag}_START`,
        );
      }
    });
  }
});

// ── Next.js: validated env ──────────────────────────────────────────────────

describe("Next.js integration templates use validated env", () => {
  const integrationDirs = ["supabase", "posthog", "sentry"];

  for (const integration of integrationDirs) {
    const integrationPath = join(NEXTJS_DIR, integration);
    const files = walkFiles(integrationPath).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
    );

    for (const file of files) {
      const relPath = file.slice(TEMPLATES.length + 1);

      it(`${relPath} does not use process.env`, () => {
        const content = readFileSync(file, "utf-8");
        assert.ok(
          !content.includes("process.env"),
          `${relPath} should use the validated env object from "~/env" instead of process.env`,
        );
      });

      it(`${relPath} imports from ~/env`, () => {
        const content = readFileSync(file, "utf-8");
        assert.ok(
          content.includes('from "~/env"'),
          `${relPath} should import the validated env object from "~/env"`,
        );
      });
    }
  }
});

describe("Next.js env.ts uses process.env in runtimeEnv", () => {
  it("base/src/env.ts accesses process.env for validation wiring", () => {
    const envFile = join(NEXTJS_DIR, "base", "src", "env.ts");
    const content = readFileSync(envFile, "utf-8");
    assert.ok(
      content.includes("process.env"),
      "env.ts should use process.env to feed values into the validator",
    );
    assert.ok(
      content.includes("createEnv"),
      "env.ts should use @t3-oss/env-nextjs createEnv",
    );
  });
});

describe("Shared gitignore protects local generated-project files", () => {
  const gitignore = readFileSync(
    join(TEMPLATES, "shared", ".gitignore"),
    "utf-8",
  )
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");

  it("ignores local-only files and generated output for both frameworks", () => {
    assert.match(gitignore, /(^|\n)node_modules\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)\/\.env(\n|$)/);
    assert.match(gitignore, /(^|\n)\/\.env\.\*(\n|$)/);
    assert.match(gitignore, /(^|\n)!\/\.env\.example(\n|$)/);
    assert.match(gitignore, /(^|\n)!\/\.env\.\*\.example(\n|$)/);
    assert.match(gitignore, /(^|\n)\.claude\/worktrees\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)\.claude\/settings\.local\.json(\n|$)/);
    assert.match(gitignore, /(^|\n)\.next\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)\.expo\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)dist\/?(\n|$)/);
    assert.match(gitignore, /(^|\n)supabase\/\.temp\/?(\n|$)/);
  });
});

describe("Shared Claude worktree include copies local generated-project config", () => {
  const worktreeincludePath = join(TEMPLATES, "shared", ".worktreeinclude");
  const worktreeinclude = existsSync(worktreeincludePath)
    ? readFileSync(worktreeincludePath, "utf-8")
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
    : "";

  it("includes local env and Claude local settings files", () => {
    assert.ok(existsSync(worktreeincludePath), ".worktreeinclude should exist");
    assert.match(worktreeinclude, /(^|\n)\/\.env(\n|$)/);
    assert.match(worktreeinclude, /(^|\n)\/\.env\.local(\n|$)/);
    assert.match(worktreeinclude, /(^|\n)\/\.env\.\*(\n|$)/);
    assert.match(
      worktreeinclude,
      /(^|\n)\/\.claude\/settings\.local\.json(\n|$)/,
    );
  });

  it("only asks Claude to copy files ignored by generated gitignore", {
    skip: !hasGit(),
  }, () => {
    const projectPath = mkdtempSync(
      join(tmpdir(), "create-lumos-app-worktreeinclude-"),
    );

    try {
      cpSync(
        join(TEMPLATES, "shared", ".gitignore"),
        join(projectPath, ".gitignore"),
      );
      cpSync(worktreeincludePath, join(projectPath, ".worktreeinclude"));
      mkdirSync(join(projectPath, ".claude", "worktrees", "state"), {
        recursive: true,
      });
      writeFileSync(join(projectPath, ".env"), "ROOT_ENV=1\n");
      writeFileSync(join(projectPath, ".env.local"), "LOCAL_ENV=1\n");
      writeFileSync(join(projectPath, ".env.example"), "EXAMPLE_ENV=1\n");
      writeFileSync(
        join(projectPath, ".claude", "settings.local.json"),
        "{}\n",
      );

      execFileSync("git", ["init", "--initial-branch=main"], {
        cwd: projectPath,
        stdio: "ignore",
      });

      for (const path of [
        ".env",
        ".env.local",
        ".claude/settings.local.json",
        ".claude/worktrees/state",
      ]) {
        execFileSync("git", ["check-ignore", "-q", path], {
          cwd: projectPath,
        });
      }

      assert.throws(() =>
        execFileSync("git", ["check-ignore", "-q", ".env.example"], {
          cwd: projectPath,
        }),
      );
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
});

describe("Generated Claude Stop hook", () => {
  const hookPath = join(
    TEMPLATES,
    "shared",
    ".claude",
    "hooks",
    "stop-checks.sh",
  );

  it("delegates to verify and blocks when that script fails", () => {
    const projectPath = mkdtempSync(
      join(tmpdir(), "create-lumos-app-hook-lint-"),
    );
    try {
      mkdirSync(join(projectPath, "node_modules"));
      writeFileSync(
        join(projectPath, "package.json"),
        JSON.stringify({
          scripts: {
            verify:
              "node -e \"require('node:fs').writeFileSync('verify-ran', 'yes'); process.exit(1)\"",
          },
        }),
      );
      const result = spawnSync("sh", [hookPath], {
        cwd: projectPath,
        encoding: "utf-8",
      });
      assert.ifError(result.error);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.ok(existsSync(join(projectPath, "verify-ran")));
      assert.match(result.stderr, /verify/);
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });

  it("is referenced by the repo and shared template settings", () => {
    for (const [settingsPath, command] of [
      [
        join(TEMPLATES, "..", ".claude", "settings.json"),
        "sh templates/shared/.claude/hooks/stop-checks.sh",
      ],
      [
        join(TEMPLATES, "shared", ".claude", "settings.json"),
        "sh .claude/hooks/stop-checks.sh",
      ],
    ]) {
      const settings = claudeSettingsSchema.parse(
        JSON.parse(readFileSync(settingsPath, "utf-8")),
      );
      assert.equal(settings.hooks.Stop[0].hooks[0].command, command);
    }
  });

  it("skips cleanly before dependencies are installed in a fresh worktree", () => {
    const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-hook-"));
    const packageJsonPath = join(projectPath, "package.json");
    const packageJson = `${JSON.stringify({
      name: "hook-test",
      scripts: {
        format: "biome format --write .",
        lint: "biome check .",
        typecheck: "tsc --noEmit",
      },
    })}\n`;

    try {
      writeFileSync(packageJsonPath, packageJson);
      writeFileSync(join(projectPath, "pnpm-lock.yaml"), "\n");

      execFileSync("sh", [hookPath], {
        cwd: projectPath,
        encoding: "utf-8",
        stdio: "pipe",
      });

      assert.equal(readFileSync(packageJsonPath, "utf-8"), packageJson);
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
});

describe("Generated Biome configs ignore agent-managed skill bundles", () => {
  for (const [framework, configPath] of [
    ["Next.js", join(NEXTJS_DIR, "base", "_biome.json")],
    ["Expo", join(EXPO_DIR, "base", "_biome.json")],
  ]) {
    it(`${framework} excludes .agents from Biome checks`, () => {
      const config = z
        .object({ files: z.object({ includes: z.array(z.string()) }) })
        .parse(JSON.parse(readFileSync(configPath, "utf-8")));

      assert.ok(
        config.files.includes.includes("!.agents"),
        `${framework} Biome config should not lint downloaded skills`,
      );
      assert.ok(
        config.files.includes.includes("!.claude/worktrees"),
        `${framework} Biome config should not lint Claude worktrees`,
      );
    });
  }
});

// ── Expo: validated env ──────────────────────────────────────────────────────

describe("Expo integration templates use validated env", () => {
  const integrationDirs = ["supabase", "posthog", "sentry"];

  for (const integration of integrationDirs) {
    const integrationPath = join(EXPO_DIR, integration);
    const files = walkFiles(integrationPath).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".tsx"),
    );

    for (const file of files) {
      const relPath = file.slice(TEMPLATES.length + 1);

      it(`${relPath} does not use process.env`, () => {
        const content = readFileSync(file, "utf-8");
        assert.ok(
          !content.includes("process.env"),
          `${relPath} should use the validated env object from "@/env" instead of process.env`,
        );
      });

      it(`${relPath} imports from @/env`, () => {
        const content = readFileSync(file, "utf-8");
        assert.ok(
          content.includes('from "@/env"'),
          `${relPath} should import the validated env object from "@/env"`,
        );
      });
    }
  }
});

describe("Expo base templates do not use process.env", () => {
  const baseFiles = walkFiles(join(EXPO_DIR, "base")).filter(
    (f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.endsWith("env.ts"),
  );

  for (const file of baseFiles) {
    const relPath = file.slice(TEMPLATES.length + 1);
    const content = readFileSync(file, "utf-8");

    if (!content.includes("process.env")) continue;

    it(`${relPath} does not use process.env`, () => {
      assert.ok(
        !content.includes("process.env"),
        `${relPath} should use the validated env object from "@/env" or Platform.OS instead of process.env`,
      );
    });
  }
});

describe("Expo env.ts uses process.env for validation wiring", () => {
  it("base/env.ts accesses process.env to feed values into the validator", () => {
    const envFile = join(EXPO_DIR, "base", "env.ts");
    const content = readFileSync(envFile, "utf-8");
    assert.ok(
      content.includes("process.env"),
      "env.ts should use process.env to feed values into the Zod validator",
    );
    assert.ok(
      content.includes("z.object"),
      "env.ts should use a Zod schema for validation",
    );
  });
});

describe("Expo CSS imports are typed", () => {
  it("declares CSS modules for the global.css side-effect import", () => {
    const nativewindEnv = readFileSync(
      join(EXPO_DIR, "base", "nativewind-env.d.ts"),
      "utf-8",
    );

    assert.ok(nativewindEnv.includes('declare module "*.css"'));
  });
});

// ── Expo: naming conventions ────────────────────────────────────────────────

describe("Expo templates use kebab-case file names", () => {
  const codeExtensions = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".css",
    ".json",
  ]);

  const allowedExceptions = new Set(["AGENTS.md", "CLAUDE.md"]);

  for (const file of walkFiles(EXPO_DIR)) {
    const relPath = file.slice(TEMPLATES.length + 1);
    const name = basename(file);

    if (!codeExtensions.has(`.${name.split(".").pop()}`)) continue;
    if (allowedExceptions.has(name)) continue;
    if (name.startsWith("_")) continue;

    it(`${relPath} uses kebab-case`, () => {
      const stem = name.slice(0, name.indexOf("."));
      const isKebab = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(stem);
      assert.ok(isKebab, `${relPath} should use kebab-case (got "${name}")`);
    });
  }
});

// ── Expo: platform correctness ──────────────────────────────────────────────

describe("Expo templates have no web-only files", () => {
  it("no .web.ts or .web.tsx files exist", () => {
    const webFiles = walkFiles(EXPO_DIR).filter((f) =>
      /\.web\.[jt]sx?$/.test(f),
    );
    assert.deepStrictEqual(
      webFiles,
      [],
      `Web-only files found: ${webFiles.map((f) => f.slice(TEMPLATES.length + 1)).join(", ")}`,
    );
  });
});

describe("Expo templates do not use deprecated SafeAreaView from react-native", () => {
  for (const file of walkFiles(EXPO_DIR).filter((f) => f.endsWith(".tsx"))) {
    const relPath = file.slice(TEMPLATES.length + 1);
    const content = readFileSync(file, "utf-8");

    if (!content.includes("SafeAreaView")) continue;

    it(`${relPath} imports SafeAreaView from react-native-safe-area-context`, () => {
      assert.ok(
        content.includes('from "react-native-safe-area-context"'),
        `${relPath} should import SafeAreaView from "react-native-safe-area-context", not "react-native"`,
      );
    });

    it(`${relPath} does not import SafeAreaView from react-native`, () => {
      const rnImportMatch = content.match(
        /import\s+\{([^}]+)\}\s+from\s+"react-native"/,
      );
      if (rnImportMatch) {
        const imports = rnImportMatch[1].split(",").map((s) => s.trim());
        assert.ok(
          !imports.includes("SafeAreaView"),
          `${relPath} should not import SafeAreaView from "react-native" (it is deprecated)`,
        );
      }
    });
  }
});

// ── Expo: NativeWind styling convention ─────────────────────────────────────

describe("Expo templates do not use StyleSheet.create", () => {
  for (const file of walkFiles(EXPO_DIR).filter((f) => f.endsWith(".tsx"))) {
    const relPath = file.slice(TEMPLATES.length + 1);
    const content = readFileSync(file, "utf-8");

    if (!content.includes("StyleSheet")) continue;

    it(`${relPath} does not use StyleSheet.create`, () => {
      assert.ok(
        !content.includes("StyleSheet.create"),
        `${relPath} should use NativeWind className instead of StyleSheet.create`,
      );
    });
  }
});
