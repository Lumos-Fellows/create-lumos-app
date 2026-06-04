/**
 * Unit tests for generated project Git initialization.
 *
 * Usage: node --test test/git.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, mock } from "node:test";
import {
  GIT_INITIALIZATION_STATUS,
  INITIAL_COMMIT_MESSAGE,
  initializeGitRepository,
} from "../src/git.mjs";

function hasGit() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("initializeGitRepository", () => {
  it("runs git init, add, and commit in order for standalone projects", async () => {
    const calls = [];
    const runner = mock.fn(async (cmd, args, opts) => {
      calls.push([cmd, args, opts]);
      if (args[0] === "rev-parse") {
        throw new Error("not a git repository");
      }
    });
    const logger = { warn: mock.fn() };

    const initialized = await initializeGitRepository("/tmp/my-app", {
      runner,
      logger,
    });

    assert.equal(initialized, GIT_INITIALIZATION_STATUS.COMMITTED);
    assert.deepEqual(
      calls.map(([cmd, args]) => [cmd, args]),
      [
        ["git", ["rev-parse", "--show-toplevel"]],
        ["git", ["init"]],
        ["git", ["add", "."]],
        ["git", ["commit", "-m", INITIAL_COMMIT_MESSAGE]],
      ],
    );
    assert.ok(calls.every(([, , opts]) => opts.cwd === "/tmp/my-app"));
    assert.equal(logger.warn.mock.callCount(), 0);
  });

  it("skips projects already inside a Git repository", async () => {
    const runner = mock.fn(async () => {});
    const logger = { warn: mock.fn() };

    const initialized = await initializeGitRepository("/tmp/my-app", {
      runner,
      logger,
    });

    assert.equal(
      initialized,
      GIT_INITIALIZATION_STATUS.SKIPPED_EXISTING_REPOSITORY,
    );
    assert.equal(runner.mock.callCount(), 1);
    assert.deepEqual(runner.mock.calls[0].arguments[1], [
      "rev-parse",
      "--show-toplevel",
    ]);
    assert.equal(logger.warn.mock.callCount(), 0);
  });

  it("warns without throwing when git init fails", async () => {
    const runner = mock.fn(async (_cmd, args) => {
      if (args[0] === "rev-parse") {
        throw new Error("not a git repository");
      }
      if (args[0] === "init") {
        throw new Error("git is missing");
      }
    });
    const logger = { warn: mock.fn() };

    const initialized = await initializeGitRepository("/tmp/my-app", {
      runner,
      logger,
    });

    assert.equal(initialized, GIT_INITIALIZATION_STATUS.FAILED_BEFORE_INIT);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.ok(
      logger.warn.mock.calls[0].arguments[0].includes(
        "before a repository was created",
      ),
    );
  });

  it("warns with partial-state context when Git commit fails", async () => {
    const runner = mock.fn(async (_cmd, args) => {
      if (args[0] === "rev-parse") {
        throw new Error("not a git repository");
      }
      if (args[0] === "commit") {
        throw new Error("missing user identity");
      }
    });
    const logger = { warn: mock.fn() };

    const initialized = await initializeGitRepository("/tmp/my-app", {
      runner,
      logger,
    });

    assert.equal(initialized, GIT_INITIALIZATION_STATUS.FAILED_AFTER_INIT);
    assert.equal(logger.warn.mock.callCount(), 1);
    assert.ok(
      logger.warn.mock.calls[0].arguments[0].includes(
        "Git was initialized, but the initial commit failed",
      ),
    );
  });

  it(
    "creates a clean initial commit with generated app files",
    { skip: !hasGit() },
    async () => {
      const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-git-"));
      try {
        mkdirSync(join(projectPath, "src", "app", "notes"), {
          recursive: true,
        });
        mkdirSync(join(projectPath, "node_modules"), { recursive: true });
        mkdirSync(join(projectPath, ".next"), { recursive: true });
        mkdirSync(join(projectPath, "supabase", ".temp"), {
          recursive: true,
        });

        writeFileSync(
          join(projectPath, ".gitignore"),
          "node_modules\n.next\n.env*.local\nsupabase/.temp\n",
        );
        writeFileSync(join(projectPath, ".env.local"), "LOCAL_ONLY=1\n");
        writeFileSync(
          join(projectPath, "src", "app", "notes", "page.tsx"),
          "export default function NotesPage() { return null; }\n",
        );
        writeFileSync(join(projectPath, "README.md"), "# Test app\n");
        writeFileSync(
          join(projectPath, "node_modules", "ignored.js"),
          "ignored\n",
        );
        writeFileSync(join(projectPath, ".next", "ignored"), "ignored\n");
        writeFileSync(
          join(projectPath, "supabase", ".temp", "ignored"),
          "ignored\n",
        );

        const initialized = await initializeGitRepository(projectPath, {
          runner: (cmd, args, opts) =>
            execFileSync(cmd, args, {
              ...opts,
              encoding: "utf-8",
              stdio: "pipe",
              env: {
                ...process.env,
                GIT_AUTHOR_NAME: "create-lumos-app tests",
                GIT_AUTHOR_EMAIL: "tests@example.com",
                GIT_COMMITTER_NAME: "create-lumos-app tests",
                GIT_COMMITTER_EMAIL: "tests@example.com",
              },
            }),
        });

        assert.equal(initialized, GIT_INITIALIZATION_STATUS.COMMITTED);
        assert.equal(
          execFileSync("git", ["status", "--short"], {
            cwd: projectPath,
            encoding: "utf-8",
          }),
          "",
        );
        const head = execFileSync(
          "git",
          ["show", "--name-only", "--oneline", "HEAD"],
          {
            cwd: projectPath,
            encoding: "utf-8",
          },
        );
        assert.ok(head.includes("src/app/notes/page.tsx"));
        assert.ok(head.includes(INITIAL_COMMIT_MESSAGE));
        assert.ok(!head.includes("Initial commit from Create Next App"));
        assert.ok(!head.includes(".env.local"));
        assert.ok(!head.includes("node_modules"));
        assert.ok(!head.includes(".next"));
        assert.ok(!head.includes("supabase/.temp"));
      } finally {
        rmSync(projectPath, { recursive: true, force: true });
      }
    },
  );
});
