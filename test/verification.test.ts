import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const VERIFY = fileURLToPath(
  new URL("../templates/shared/tools/verify.ts", import.meta.url),
);

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
