import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { applyOverlay } from "../src/overlay.mjs";
import antiSlop from "../templates/shared/tools/oxlint/anti-slop/index.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const OXLINT = join(
  dirname(require.resolve("oxlint/package.json")),
  "bin/oxlint",
);
const REJECTED_CODE =
  'export const value = Reflect.get({ name: "Ada" }, "name");\n';

function lint(cwd, args) {
  const result = spawnSync(process.execPath, [OXLINT, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30_000,
  });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

describe("Anti-slop integration", () => {
  it("enables every vendored generic rule as an error", () => {
    const config = JSON.parse(
      readFileSync(join(ROOT, "templates/shared/.oxlintrc.json"), "utf-8"),
    );
    const enabledRules = Object.keys(antiSlop.rules).map(
      (name) => `anti-slop/${name}`,
    );
    assert.equal(enabledRules.length, 15);
    assert.deepEqual(Object.keys(config.rules).sort(), enabledRules.sort());
    for (const rule of enabledRules) assert.equal(config.rules[rule], "error");
  });

  for (const framework of ["nextjs", "expo"]) {
    it(`${framework} templates pass every integration combination`, () => {
      const integrations = [
        framework === "nextjs" ? "shadcn" : "rnr",
        "supabase",
        "posthog",
        "sentry",
      ];
      const templates =
        framework === "nextjs" ? ["bare", "notes-app"] : ["bare"];
      for (const template of templates) {
        for (let mask = 0; mask < 2 ** integrations.length; mask++) {
          const options = {
            framework,
            template,
            ...Object.fromEntries(
              integrations.map((name, index) => [
                name,
                Boolean(mask & (1 << index)),
              ]),
            ),
          };
          const projectPath = mkdtempSync(join(ROOT, ".anti-slop-test-"));
          try {
            applyOverlay(projectPath, options);
            const result = lint(projectPath, ["."]);
            assert.equal(
              result.status,
              0,
              `${JSON.stringify(options)}\n${result.output}`,
            );
          } finally {
            rmSync(projectPath, { recursive: true, force: true });
          }
        }
      }
    });

    it(`${framework} loads the copied plugin, ignores tooling, and rejects owned violations`, () => {
      // Keep the fixture under the repo so its copied plugin resolves installed dependencies.
      const projectPath = mkdtempSync(join(ROOT, ".anti-slop-test-"));
      try {
        applyOverlay(projectPath, { framework, template: "bare" });
        for (const directory of [
          ".agents/example",
          ".claude/hooks",
          "tools/oxlint/anti-slop",
        ]) {
          mkdirSync(join(projectPath, directory), { recursive: true });
          writeFileSync(
            join(projectPath, directory, "ignored.ts"),
            REJECTED_CODE,
          );
        }
        const fixture = join(projectPath, "lint-smoke.ts");
        writeFileSync(
          fixture,
          'const user = { name: "Ada" } as const;\nexport const name = user.name;\n',
        );
        const accepted = lint(projectPath, ["."]);
        assert.equal(accepted.status, 0, accepted.output);

        writeFileSync(fixture, REJECTED_CODE);
        const rejected = lint(projectPath, ["."]);
        assert.equal(rejected.status, 1, rejected.output);
        assert.match(
          rejected.output,
          /anti-slop\(no-reflect-get\)|anti-slop\/no-reflect-get/,
        );
        assert.match(rejected.output, /lint-smoke\.ts/);
        assert.doesNotMatch(rejected.output, /ignored\.ts/);

        // The root config must resolve the same plugin through its shared config.
        const rootCheck = lint(ROOT, ["--config", ".oxlintrc.json", fixture]);
        assert.equal(rootCheck.status, 1, rootCheck.output);
        assert.match(rootCheck.output, /no-reflect-get/);
      } finally {
        rmSync(projectPath, { recursive: true, force: true });
      }
    });
  }
});
