/**
 * Unit tests for package dependency planning.
 *
 * Usage: node --test test/packages.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBasePackageDeps } from "../src/packages.mjs";

describe("getBasePackageDeps", () => {
  it("includes Expo packages imported by the generated base template", () => {
    const { deps, devDeps } = getBasePackageDeps("expo");

    assert.ok(deps.includes("@expo/vector-icons"));
    assert.ok(deps.includes("@react-navigation/elements"));
    assert.ok(!deps.includes("@react-navigation/bottom-tabs"));
    assert.ok(deps.includes("expo-haptics"));
    assert.ok(devDeps.includes("nativewind"));
  });
});
