import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import { checkPackage } from "../scripts/check-package.ts";

it("rejects built files that npm silently omits", () => {
  mkdirSync("dist", { recursive: true });
  const probe = mkdtempSync(join("dist", "package-check-"));
  try {
    writeFileSync(join(probe, ".gitignore"), ".env.local\n");
    assert.throws(
      () => checkPackage(),
      /npm would omit built files:[\s\S]*\.gitignore/,
    );
  } finally {
    rmSync(probe, { recursive: true, force: true });
  }
});
