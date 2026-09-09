import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { claudeSettingsSchema } from "./helpers/config.ts";

const VERIFY = fileURLToPath(
  new URL("../templates/shared/tools/verify.ts", import.meta.url),
);

const REPO = fileURLToPath(new URL("..", import.meta.url));

describe("Shared agent hooks", () => {
  for (const source of [".", "templates/shared"]) {
    it(`${source} uses the same hook for both harnesses and resolves a nested working directory`, () => {
      const configurations = [".codex/hooks.json", ".claude/settings.json"].map(
        (path) =>
          claudeSettingsSchema.parse(
            JSON.parse(readFileSync(join(REPO, source, path), "utf8")),
          ),
      );
      const command = configurations[0].hooks.Stop[0].hooks[0].command;
      assert.equal(command, configurations[1].hooks.Stop[0].hooks[0].command);
      const project = mkdtempSync(join(tmpdir(), "lumos hook "));
      try {
        const tools = source === "." ? "templates/shared/tools" : "tools";
        cpSync(join(REPO, "templates/shared/tools"), join(project, tools), {
          recursive: true,
          filter: (path) => !path.includes("oxlint"),
        });
        symlinkSync(
          join(REPO, "node_modules"),
          join(project, "node_modules"),
          "junction",
        );
        execFileSync("git", ["init", "--quiet"], { cwd: project });
        mkdirSync(join(project, "nested"));
        for (const code of [0, 1]) {
          writeFileSync(
            join(project, "package.json"),
            JSON.stringify({
              packageManager: "npm@11.0.0",
              scripts: {
                verify: `node -e "require('node:fs').writeFileSync('checked', process.cwd()); process.exit(${code})"`,
              },
            }),
          );
          const result = spawnSync("bash", ["-c", command], {
            cwd: join(project, "nested"),
            encoding: "utf8",
            timeout: 30_000,
          });
          assert.ifError(result.error);
          assert.equal(
            result.status,
            code === 0 ? 0 : 2,
            result.stdout + result.stderr,
          );
          assert.equal(result.stdout, "");
          assert.equal(
            readFileSync(join(project, "checked"), "utf8"),
            realpathSync(project),
          );
        }
      } finally {
        rmSync(project, { recursive: true, force: true });
      }
    });
  }

  it("blocks with an actionable message when dependencies are missing", () => {
    const project = mkdtempSync(join(tmpdir(), "lumos-hook-missing-"));
    try {
      const result = spawnSync(
        "bash",
        [join(REPO, "templates/shared/tools/agent-stop.sh")],
        {
          cwd: project,
          encoding: "utf8",
        },
      );
      assert.ifError(result.error);
      assert.equal(result.status, 2);
      assert.match(result.stderr, /install this project's dependencies/);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("Shared verification", () => {
  for (const packageManager of ["npm", "pnpm"]) {
    for (const failLint of [false, true]) {
      it(`${packageManager} ${failLint ? "reports lint failures and continues remaining checks" : "runs available checks successfully"}`, () => {
        const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-verify-"));
        try {
          writeFileSync(
            join(projectPath, "check.mjs"),
            `
import { appendFileSync } from "node:fs";
const name = process.argv[2];
appendFileSync("checks.jsonl", JSON.stringify({ name, env: process.env.SKIP_ENV_VALIDATION, manager: process.env.npm_execpath }) + "\\n");
if (name === "lint" && ${failLint}) process.exitCode = 1;
`,
          );
          writeFileSync(
            join(projectPath, "package.json"),
            JSON.stringify({
              packageManager: `${packageManager}@${packageManager === "npm" ? "11.0.0" : "10.29.3"}`,
              scripts: {
                format: "node check.mjs format",
                lint: "node check.mjs lint",
                typecheck: "node check.mjs typecheck",
                "test:unit": "node check.mjs test:unit",
                test: "node check.mjs test",
                verify: 'node -e "process.exit(99)"',
              },
            }),
          );
          const result = spawnSync(
            process.execPath,
            ["--import", import.meta.resolve("tsx"), VERIFY],
            {
              cwd: projectPath,
              encoding: "utf-8",
              timeout: 30_000,
            },
          );
          assert.ifError(result.error);
          assert.equal(
            result.status,
            failLint ? 1 : 0,
            result.stdout + result.stderr,
          );
          const checks = readFileSync(
            join(projectPath, "checks.jsonl"),
            "utf-8",
          )
            .trim()
            .split("\n")
            .map((line) =>
              z
                .object({
                  name: z.string(),
                  env: z.string(),
                  manager: z.string(),
                })
                .parse(JSON.parse(line)),
            );
          assert.deepEqual(
            checks.map((check) => check.name),
            ["format", "lint", "typecheck", "test:unit", "test"],
          );
          assert.ok(
            checks.every(
              (check) =>
                check.env === "true" &&
                basename(check.manager).startsWith(packageManager),
            ),
          );
          if (failLint) assert.match(result.stderr, /lint FAILED/);
        } finally {
          rmSync(projectPath, { recursive: true, force: true });
        }
      });
    }
  }
});
