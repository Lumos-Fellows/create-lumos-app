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
  setupPackages,
} from "../src/packages.mjs";

describe("getBasePackageDeps", () => {
  it("includes Expo packages imported by the generated base template", () => {
    const { deps, devDeps } = getBasePackageDeps("expo");

    assert.ok(deps.includes("@expo/vector-icons"));
    assert.ok(deps.includes("@react-navigation/elements"));
    assert.ok(!deps.includes("@react-navigation/bottom-tabs"));
    assert.ok(deps.includes("expo-haptics"));
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
        },
      );

      const envPath = join(projectPath, ".env.local");
      assert.ok(existsSync(envPath), ".env.local should be created");
      assert.match(readFileSync(envPath, "utf-8"), /NEXT_PUBLIC_SUPABASE_URL=/);
    } finally {
      rmSync(projectPath, { recursive: true, force: true });
    }
  });
});
