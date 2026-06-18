/**
 * Unit tests for generated project Git initialization.
 *
 * Usage: node --test test/git.test.mjs
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

function runGitWithTestIdentity(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
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
  });
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
        ["git", ["init", "--initial-branch=main"]],
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

  it(
    "creates the initial commit on main when Git has no configured default branch",
    { skip: !hasGit() },
    async () => {
      const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-git-"));
      const worktreePath = `${projectPath}-worktree-from-main`;
      const globalConfigPath = join(projectPath, "empty-gitconfig");

      try {
        writeFileSync(globalConfigPath, "");
        writeFileSync(join(projectPath, ".gitignore"), "\n");
        writeFileSync(join(projectPath, "README.md"), "# Test app\n");

        const initialized = await initializeGitRepository(projectPath, {
          runner: (cmd, args, opts) =>
            execFileSync(cmd, args, {
              ...opts,
              encoding: "utf-8",
              stdio: "pipe",
              env: {
                ...process.env,
                GIT_CONFIG_GLOBAL: globalConfigPath,
                GIT_CONFIG_NOSYSTEM: "1",
                GIT_AUTHOR_NAME: "create-lumos-app tests",
                GIT_AUTHOR_EMAIL: "tests@example.com",
                GIT_COMMITTER_NAME: "create-lumos-app tests",
                GIT_COMMITTER_EMAIL: "tests@example.com",
              },
            }),
        });

        assert.equal(initialized, GIT_INITIALIZATION_STATUS.COMMITTED);
        assert.equal(
          execFileSync("git", ["branch", "--show-current"], {
            cwd: projectPath,
            encoding: "utf-8",
            env: {
              ...process.env,
              GIT_CONFIG_GLOBAL: globalConfigPath,
              GIT_CONFIG_NOSYSTEM: "1",
            },
          }).trim(),
          "main",
        );

        execFileSync(
          "git",
          ["worktree", "add", "-b", "test-worktree", worktreePath, "main"],
          {
            cwd: projectPath,
            encoding: "utf-8",
            stdio: "pipe",
            env: {
              ...process.env,
              GIT_CONFIG_GLOBAL: globalConfigPath,
              GIT_CONFIG_NOSYSTEM: "1",
            },
          },
        );
        assert.equal(
          realpathSync(
            execFileSync("git", ["rev-parse", "--show-toplevel"], {
              cwd: worktreePath,
              encoding: "utf-8",
              env: {
                ...process.env,
                GIT_CONFIG_GLOBAL: globalConfigPath,
                GIT_CONFIG_NOSYSTEM: "1",
              },
            }).trim(),
          ),
          realpathSync(worktreePath),
        );
      } finally {
        rmSync(worktreePath, { recursive: true, force: true });
        rmSync(projectPath, { recursive: true, force: true });
      }
    },
  );

  it(
    "replaces scaffold-created root Git history when requested",
    { skip: !hasGit() },
    async () => {
      const projectPath = mkdtempSync(join(tmpdir(), "create-lumos-app-git-"));

      try {
        writeFileSync(join(projectPath, ".gitignore"), ".env.local\n");
        writeFileSync(join(projectPath, "package.json"), "{}\n");
        runGitWithTestIdentity("git", ["init", "--initial-branch=main"], {
          cwd: projectPath,
        });
        runGitWithTestIdentity("git", ["add", "package.json"], {
          cwd: projectPath,
        });
        runGitWithTestIdentity("git", ["commit", "-m", "Initial commit"], {
          cwd: projectPath,
        });

        writeFileSync(join(projectPath, ".worktreeinclude"), "/.env.local\n");
        writeFileSync(join(projectPath, ".env.local"), "LOCAL_ONLY=1\n");
        writeFileSync(join(projectPath, "README.md"), "# Test app\n");

        const initialized = await initializeGitRepository(projectPath, {
          runner: runGitWithTestIdentity,
          resetExistingRootRepository: true,
        });

        assert.equal(initialized, GIT_INITIALIZATION_STATUS.COMMITTED);
        assert.equal(
          execFileSync("git", ["rev-list", "--count", "HEAD"], {
            cwd: projectPath,
            encoding: "utf-8",
          }).trim(),
          "1",
        );

        const head = execFileSync(
          "git",
          ["show", "--name-only", "--oneline", "HEAD"],
          {
            cwd: projectPath,
            encoding: "utf-8",
          },
        );
        assert.ok(head.includes(INITIAL_COMMIT_MESSAGE));
        assert.ok(head.includes(".worktreeinclude"));
        assert.ok(!head.includes(".env.local"));
        assert.ok(!head.includes("Initial commit\n"));
      } finally {
        rmSync(projectPath, { recursive: true, force: true });
      }
    },
  );
});
