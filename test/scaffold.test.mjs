/**
 * Unit tests for base scaffold command construction.
 *
 * Usage: node --test test/scaffold.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scaffoldCommand } from "../src/scaffold.mjs";

describe("scaffoldCommand", () => {
  it("disables create-next-app Git initialization", () => {
    const { cmd, args } = scaffoldCommand({
      framework: "nextjs",
      packageManager: "pnpm",
      scaffoldTarget: "my-app",
    });

    assert.equal(cmd, "npx");
    assert.ok(
      args.includes("--disable-git"),
      "create-next-app should not create the initial blank scaffold commit",
    );
  });

  it("uses the selected package manager flag", () => {
    assert.ok(
      scaffoldCommand({
        framework: "nextjs",
        packageManager: "pnpm",
        scaffoldTarget: "my-app",
      }).args.includes("--use-pnpm"),
    );
    assert.ok(
      scaffoldCommand({
        framework: "nextjs",
        packageManager: "npm",
        scaffoldTarget: "my-app",
      }).args.includes("--use-npm"),
    );
  });

  it("plans Expo scaffolding for pnpm and npm", () => {
    assert.deepEqual(
      scaffoldCommand({
        framework: "expo",
        packageManager: "pnpm",
        scaffoldTarget: "my-app",
      }),
      {
        cmd: "pnpm",
        args: [
          "create",
          "expo-app@latest",
          "my-app",
          "--template",
          "tabs",
          "--yes",
        ],
      },
    );

    assert.deepEqual(
      scaffoldCommand({
        framework: "expo",
        packageManager: "npm",
        scaffoldTarget: "my-app",
      }),
      {
        cmd: "npx",
        args: [
          "create-expo-app@latest",
          "my-app",
          "--template",
          "tabs",
          "--yes",
        ],
      },
    );
  });
});
