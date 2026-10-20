import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";
import {
  sourceFiles,
  validateSourceFiles,
} from "../templates/shared/tools/typecheck-policy.js";

it("checks compiler coverage, strict settings, and runtime JavaScript without a Git repository", () => {
  const root = process.cwd();
  const project = mkdtempSync(join(root, ".typecheck-test-with-spaces-"));
  const script = join(root, "templates/shared/tools/typecheck.ts");
  try {
    mkdirSync(join(project, "src"));
    mkdirSync(join(project, "outside"));
    writeFileSync(
      join(project, "src/main.ts"),
      'export const label = "hello";\n',
    );
    const options = {
      target: "ES2022",
      module: "NodeNext",
      strict: true,
      skipLibCheck: true,
      noCheck: false,
      noImplicitAny: true,
    };
    const appConfig = { compilerOptions: options, include: ["src/**/*.ts"] };
    const tooling = {
      extends: "./tsconfig.json",
      compilerOptions: { allowJs: true, checkJs: true },
      include: ["*.mjs"],
    };
    function writeConfigs() {
      writeFileSync(join(project, "tsconfig.json"), JSON.stringify(appConfig));
      writeFileSync(
        join(project, "tsconfig.tooling.json"),
        JSON.stringify(tooling),
      );
    }
    writeFileSync(join(project, "postcss.config.mjs"), "export default {};\n");
    writeConfigs();
    function check(pattern?: RegExp) {
      const result = spawnSync(process.execPath, ["--import", "tsx", script], {
        cwd: project,
        encoding: "utf8",
      });
      assert.ifError(result.error);
      const output = result.stdout + result.stderr;
      assert.equal(result.status, pattern ? 1 : 0, output);
      if (pattern) assert.match(output, pattern);
    }
    check();
    writeFileSync(
      join(project, "outside/helper.ts"),
      'export const value = "hello";\n',
    );
    check(/outside\/helper.ts: not covered/);
    writeFileSync(
      join(project, "src/main.ts"),
      'export { value } from "../outside/helper.js";\n',
    );
    check();
    for (const extension of ["js", "jsx", "mjs", "cjs"]) {
      const path = join(project, `outside/new.${extension}`);
      writeFileSync(path, "export const value = 1;\n");
      check(/use TypeScript for maintained code/);
      rmSync(path);
    }
    tooling.compilerOptions.checkJs = false;
    writeConfigs();
    check(/runtime JavaScript must be covered by checkJs/);
    tooling.compilerOptions.checkJs = true;
    options.strict = false;
    writeConfigs();
    check(/keep strict typechecking enabled/);
    options.strict = true;
    options.noCheck = true;
    writeConfigs();
    check(/keep strict typechecking enabled/);
    options.noCheck = false;
    options.noImplicitAny = false;
    writeConfigs();
    check(/noImplicitAny/);
    options.noImplicitAny = true;
    writeConfigs();
    writeFileSync(
      join(project, "outside/helper.ts"),
      '// @ts-nocheck\nexport const value = "hello";\n',
    );
    check(/remove @ts-nocheck/);
    writeFileSync(
      join(project, "outside/helper.ts"),
      'export const value = "@ts-nocheck";\n',
    );
    check();
    writeFileSync(
      join(project, "postcss.config.mjs"),
      '/** @type {number} */\nconst value = "wrong"; export default value;\n',
    );
    check(/not assignable to type 'number'/);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

it("excludes compiled plugins and installed skills while retaining nearby maintained tools", () => {
  const project = mkdtempSync(join(process.cwd(), ".typecheck-test-"));
  try {
    for (const path of [
      "tools/oxlint",
      ".agents/skills/example",
      "out",
      "web-build",
      ".vercel",
      "src/build",
      "tools",
    ]) {
      mkdirSync(join(project, path), { recursive: true });
      writeFileSync(
        join(project, path, "source.ts"),
        "export const value = 1;\n",
      );
    }
    const files = sourceFiles(project, false);
    assert.deepEqual(files.sort(), ["src/build/source.ts", "tools/source.ts"]);
    assert.equal(
      validateSourceFiles(project, files, new Set(), new Set(), false).length,
      2,
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
