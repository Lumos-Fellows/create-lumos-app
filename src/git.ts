import { realpathSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import type { GitRunner } from "./types.ts";
import { run } from "./utils.ts";

export const INITIAL_COMMIT_MESSAGE = "Initial commit from create-lumos-app";

export const GIT_INITIALIZATION_STATUS = Object.freeze({
  COMMITTED: "committed",
  SKIPPED_EXISTING_REPOSITORY: "skipped-existing-repository",
  FAILED_BEFORE_INIT: "failed-before-init",
  FAILED_AFTER_INIT: "failed-after-init",
});

async function getExistingGitRepositoryRoot(
  projectPath: string,
  runner: GitRunner,
) {
  try {
    const root = await runner("git", ["rev-parse", "--show-toplevel"], {
      cwd: projectPath,
    });
    return String(root).trim();
  } catch {
    return null;
  }
}

async function initializeRepositoryOnMain(
  projectPath: string,
  runner: GitRunner,
) {
  try {
    await runner("git", ["init", "--initial-branch=main"], {
      cwd: projectPath,
    });
  } catch {
    await runner("git", ["init"], { cwd: projectPath });
    await runner("git", ["branch", "-M", "main"], { cwd: projectPath });
  }
}

function isSamePath(a: string, b: string) {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return a === b;
  }
}

function removeExistingRootRepository(projectPath: string) {
  rmSync(join(projectPath, ".git"), { recursive: true, force: true });
}

export async function initializeGitRepository(
  projectPath: string,
  {
    runner = run,
    logger = p.log,
    resetExistingRootRepository = false,
  }: {
    runner?: GitRunner;
    logger?: Pick<typeof p.log, "warn">;
    resetExistingRootRepository?: boolean;
  } = {},
) {
  const existingRepositoryRoot = await getExistingGitRepositoryRoot(
    projectPath,
    runner,
  );
  if (existingRepositoryRoot) {
    if (
      resetExistingRootRepository &&
      isSamePath(existingRepositoryRoot, projectPath)
    ) {
      removeExistingRootRepository(projectPath);
    } else {
      return GIT_INITIALIZATION_STATUS.SKIPPED_EXISTING_REPOSITORY;
    }
  }

  try {
    await initializeRepositoryOnMain(projectPath, runner);
  } catch (err) {
    logger.warn(
      `Git initialization failed before a repository was created. Your project was still created, but has no initial commit.\n\n${String(err)}`,
    );
    return GIT_INITIALIZATION_STATUS.FAILED_BEFORE_INIT;
  }

  try {
    await runner("git", ["add", "."], { cwd: projectPath });
    await runner("git", ["commit", "-m", INITIAL_COMMIT_MESSAGE], {
      cwd: projectPath,
    });
    return GIT_INITIALIZATION_STATUS.COMMITTED;
  } catch (err) {
    logger.warn(
      `Git was initialized, but the initial commit failed. Your project was still created; files may be staged for commit.\n\n${String(err)}`,
    );
    return GIT_INITIALIZATION_STATUS.FAILED_AFTER_INIT;
  }
}
