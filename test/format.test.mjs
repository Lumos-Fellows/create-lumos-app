/**
 * Unit tests for generated project formatting commands.
 *
 * Usage: node --test test/format.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { biomeWriteCommand } from "../src/format.mjs";

describe("biomeWriteCommand", () => {
  it("runs Biome through pnpm exec", () => {
    assert.deepEqual(biomeWriteCommand("pnpm"), {
      command: "pnpm",
      args: ["exec", "biome", "check", "--write", "."],
    });
  });

  it("runs Biome through npm exec", () => {
    assert.deepEqual(biomeWriteCommand("npm"), {
      command: "npm",
      args: ["exec", "--", "biome", "check", "--write", "."],
    });
  });
});
