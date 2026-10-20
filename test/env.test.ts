import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import { applyOverlay } from "../src/overlay.ts";

it("Expo accepts empty optional settings and rejects malformed configured URLs", () => {
  const project = mkdtempSync(join(process.cwd(), ".env-test-"));
  try {
    applyOverlay(project, {
      framework: "expo",
      supabase: true,
      posthog: true,
      sentry: true,
    });
    const env = {
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: "",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "",
      EXPO_PUBLIC_POSTHOG_KEY: "",
      EXPO_PUBLIC_POSTHOG_HOST: "",
      EXPO_PUBLIC_SENTRY_DSN: "",
    };
    function check() {
      return spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "--eval",
          'await import("./env.ts")',
        ],
        { cwd: project, env, encoding: "utf8" },
      );
    }
    const empty = check();
    assert.ifError(empty.error);
    assert.equal(empty.status, 0, empty.stdout + empty.stderr);
    env.EXPO_PUBLIC_SUPABASE_URL = "invalid-url";
    const invalid = check();
    assert.ifError(invalid.error);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /EXPO_PUBLIC_SUPABASE_URL/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
