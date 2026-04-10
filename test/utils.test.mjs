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
  sanitizePackageName,
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

describe("sanitizePackageName", () => {
  it("lowercases uppercase directory names", () => {
    assert.equal(sanitizePackageName("MyProject"), "myproject");
  });

  it("replaces underscores and spaces with hyphens", () => {
    assert.equal(sanitizePackageName("My_Project"), "my-project");
    assert.equal(sanitizePackageName("My Project"), "my-project");
  });

  it("collapses multiple separators", () => {
    assert.equal(sanitizePackageName("My--App"), "my-app");
  });

  it("leaves already-valid names unchanged", () => {
    assert.equal(sanitizePackageName("my-app"), "my-app");
    assert.equal(sanitizePackageName("app123"), "app123");
  });
});
