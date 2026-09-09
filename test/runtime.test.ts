import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { packageJsonSchema } from "../src/package-json.ts";
import { assertNodeVersion, NODE_ENGINE } from "../src/runtime.ts";

it("accepts supported Node versions at each boundary", () => {
  for (const version of [
    "20.19.0",
    "20.20.1",
    "22.12.0",
    "22.22.0",
    "24.0.0",
    "25.8.2",
  ])
    assert.doesNotThrow(() => assertNodeVersion(version));
});

it("rejects unsupported or prerelease Node versions before installation", () => {
  for (const version of [
    "18.20.8",
    "20.18.3",
    "21.7.3",
    "22.11.0",
    "24.0.0-rc.1",
    "invalid",
  ])
    assert.throws(
      () => assertNodeVersion(version),
      /Upgrade Node.js and run the installer again/,
    );
});

it("advertises the same minimum required by the installed quality tools", () => {
  for (const file of [
    new URL("../package.json", import.meta.url),
    new URL("../node_modules/knip/package.json", import.meta.url),
  ]) {
    const manifest = packageJsonSchema.parse(
      JSON.parse(readFileSync(file, "utf8")),
    );
    assert.equal(manifest.engines?.node, NODE_ENGINE);
  }
});
