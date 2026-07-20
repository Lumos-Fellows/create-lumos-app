/**
 * Unit tests for package dependency planning.
 *
 * Usage: node --test test/packages.test.mjs
 */

import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  BIOME_VERSION,
  getBasePackageDeps,
  packageManagerSpec,
  pnpmWorkspaceWithAllowBuilds,
  setupPackages,
} from "../src/packages.mjs";

describe("getBasePackageDeps", () => {
  it("includes Expo packages imported by the generated base template", () => {
    const { deps, devDeps } = getBasePackageDeps("expo");

    assert.ok(deps.includes("@expo/vector-icons"));
    assert.ok(!deps.some((dep) => dep.startsWith("@react-navigation/")));
    assert.ok(deps.includes("expo-haptics"));
    assert.ok(deps.includes("react-native-css-interop"));
    assert.ok(devDeps.includes(`@biomejs/biome@${BIOME_VERSION}`));
    assert.ok(devDeps.includes("nativewind"));
  });

  it("pins Biome for generated projects", () => {
    const { devDeps } = getBasePackageDeps("nextjs");

    assert.ok(devDeps.includes("@biomejs/biome@2.4.8"));
    assert.ok(!devDeps.includes("@biomejs/biome"));
  });
});

describe("setupPackages", () => {
  it("pins the selected package manager in generated package.json", async () => {
    const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-pm-"));

    try {
      writeFileSync(
        join(projectPath, "package.json"),
        `${JSON.stringify({
          name: "test-app",
          scripts: {},
          dependencies: {},
          devDependencies: {},
        })}\n`,
      );

      await setupPackages(
        projectPath,
        {
          resolvedName: "test-app",
          framework: "nextjs",
          packageManager: "pnpm",
          shadcn: false,
          rnr: false,
          supabase: false,
          posthog: false,
          sentry: false,
        },
        {
          runner: async () => {},
          versionResolver: () => "10.29.3\n",
        },
      );

      const pkg = JSON.parse(
        readFileSync(join(projectPath, "package.json"), "utf-8"),
      );
      assert.equal(pkg.packageManager, "pnpm@10.29.3");
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });

  it("creates .env.local when selected integrations need env vars", async () => {
    const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-env-"));

    try {
      writeFileSync(
        join(projectPath, "package.json"),
        `${JSON.stringify({
          name: "test-app",
          scripts: {},
          dependencies: {},
          devDependencies: {},
        })}\n`,
      );

      await setupPackages(
        projectPath,
        {
          resolvedName: "test-app",
          framework: "nextjs",
          packageManager: "pnpm",
          shadcn: true,
          rnr: false,
          supabase: true,
          posthog: false,
          sentry: false,
        },
        {
          runner: async () => {},
          versionResolver: () => "10.29.3",
        },
      );

      const envPath = join(projectPath, ".env.local");
      assert.ok(existsSync(envPath), ".env.local should be created");
      assert.match(readFileSync(envPath, "utf-8"), /NEXT_PUBLIC_SUPABASE_URL=/);

      const workspace = readFileSync(
        join(projectPath, "pnpm-workspace.yaml"),
        "utf-8",
      );
      assert.match(workspace, /allowBuilds:\n {2}supabase: true\n/);

      const pkg = JSON.parse(
        readFileSync(join(projectPath, "package.json"), "utf-8"),
      );
      assert.equal(pkg.pnpm, undefined);
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
});

describe("pnpmWorkspaceWithAllowBuilds", () => {
  it("migrates generated pending build approvals into allowBuilds", () => {
    const workspace = pnpmWorkspaceWithAllowBuilds(
      [
        "allowBuilds:",
        "  sharp: set this to true or false",
        "ignoredBuiltDependencies:",
        "  - unrs-resolver",
        "",
      ].join("\n"),
      { supabase: true },
    );

    assert.equal(
      workspace,
      [
        "allowBuilds:",
        "  sharp: false",
        "  supabase: true",
        "  unrs-resolver: false",
        "",
      ].join("\n"),
    );
  });

  it("preserves unrelated workspace settings", () => {
    const workspace = pnpmWorkspaceWithAllowBuilds(
      ["packages:", '  - "apps/*"', ""].join("\n"),
      { supabase: true },
    );

    assert.equal(
      workspace,
      [
        "packages:",
        '  - "apps/*"',
        "",
        "allowBuilds:",
        "  supabase: true",
        "",
      ].join("\n"),
    );
  });
});

describe("packageManagerSpec", () => {
  it("normalizes version command output", () => {
    assert.equal(packageManagerSpec("pnpm", "10.29.3\n"), "pnpm@10.29.3");
  });

  it("returns null when no version is available", () => {
    assert.equal(packageManagerSpec("pnpm", null), null);
  });
});
