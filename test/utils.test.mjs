/**
 * Unit tests for utility functions.
 *
 * Usage: node --test test/utils.test.mjs
 */

import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  isCurrentDir,
  projectDir,
  validateProjectName,
} from "../src/utils.mjs";

describe("validateProjectName", () => {
  it('accepts "." as current directory', () => {
    assert.equal(validateProjectName("."), undefined);
  });

  it("accepts valid lowercase names", () => {
    assert.equal(validateProjectName("my-app"), undefined);
    assert.equal(validateProjectName("app123"), undefined);
  });

  it("rejects empty names", () => {
    assert.ok(validateProjectName(""));
    assert.ok(validateProjectName(undefined));
  });

  it("rejects invalid characters", () => {
    assert.ok(validateProjectName("My-App"));
    assert.ok(validateProjectName("my app"));
    assert.ok(validateProjectName("../sneaky"));
  });
});

describe("isCurrentDir", () => {
  it('returns true for "."', () => {
    assert.equal(isCurrentDir("."), true);
  });

  it("returns false for regular names", () => {
    assert.equal(isCurrentDir("my-app"), false);
    assert.equal(isCurrentDir("./my-app"), false);
  });
});

describe("projectDir", () => {
  it('returns cwd for "."', () => {
    assert.equal(projectDir("."), process.cwd());
  });

  it("returns subdirectory for regular names", () => {
    assert.equal(projectDir("my-app"), join(process.cwd(), "my-app"));
  });
});
