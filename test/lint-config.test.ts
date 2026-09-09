import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const biome = join(
  dirname(require.resolve("@biomejs/biome/package.json")),
  "bin/biome",
);

for (const framework of ["nextjs", "expo"]) {
  it(`${framework} requires validated env access in application code`, () => {
    const project = mkdtempSync(join(root, ".lint-test-"));
    try {
      cpSync(
        join(root, "templates", framework, "base/_biome.json"),
        join(project, "biome.json"),
      );
      const envPath = framework === "nextjs" ? "src/env.ts" : "env.ts";
      const paths = [envPath, "tools/verify.ts", "app/code.ts"];
      if (framework === "nextjs")
        paths.push("next.config.ts", "src/instrumentation.ts");
      for (const path of paths) {
        mkdirSync(dirname(join(project, path)), { recursive: true });
        writeFileSync(
          join(project, path),
          "export const value = process.env.EXAMPLE;\n",
        );
        const result = spawnSync(process.execPath, [biome, "lint", path], {
          cwd: project,
          encoding: "utf8",
        });
        assert.ifError(result.error);
        assert.equal(
          result.status,
          path === "app/code.ts" ? 1 : 0,
          result.stdout + result.stderr,
        );
        if (path === "app/code.ts") assert.match(result.stderr, /noProcessEnv/);
      }
      writeFileSync(
        join(project, "app/code.ts"),
        `import { value } from "../${envPath}";\nexport const configured = value;\n`,
      );
      const allowed = spawnSync(
        process.execPath,
        [biome, "lint", "app/code.ts"],
        {
          cwd: project,
          encoding: "utf8",
        },
      );
      assert.ifError(allowed.error);
      assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
}

for (const configPath of [
  "biome.json",
  "templates/nextjs/base/_biome.json",
  "templates/expo/base/_biome.json",
]) {
  it(`${configPath} rejects nested ternaries`, () => {
    const project = mkdtempSync(join(root, ".lint-test-"));
    try {
      cpSync(join(root, configPath), join(project, "biome.json"));
      mkdirSync(join(project, "bin"));
      writeFileSync(
        join(project, "bin/code.ts"),
        "export function label(a: boolean, b: boolean) { return a ? 'a' : b ? 'b' : 'c'; }",
      );
      const result = spawnSync(
        process.execPath,
        [biome, "lint", "bin/code.ts"],
        { cwd: project, encoding: "utf8" },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /noNestedTernary/);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
}
