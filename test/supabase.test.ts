/**
 * Unit tests for Supabase initialization.
 *
 */

import assert from "node:assert/strict";
import { ChildProcess, type SpawnOptions } from "node:child_process";
import { PassThrough } from "node:stream";
import { describe, it, mock } from "node:test";

// ── Mocks ────────────────────────────────────────────────────────────────────

const spawnMock = mock.fn<
  (command: string, args: string[], options: SpawnOptions) => ChildProcess
>(() => new ChildProcess());
mock.module("node:child_process", {
  namedExports: {
    spawn: spawnMock,
    execSync: () => "",
  },
});

const spinnerStopMock = mock.fn<(message: string) => void>();
const spinnerStartMock = mock.fn<(message: string) => void>();
const logWarnMock = mock.fn<(message: string) => void>();

mock.module("@clack/prompts", {
  namedExports: {
    spinner: () => ({ start: spinnerStartMock, stop: spinnerStopMock }),
    log: {
      step: mock.fn(),
      info: mock.fn(),
      success: mock.fn(),
      warn: logWarnMock,
    },
  },
});

const { initSupabase } = await import("../src/supabase.ts");

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetMocks() {
  spawnMock.mock.resetCalls();
  spinnerStartMock.mock.resetCalls();
  spinnerStopMock.mock.resetCalls();
  logWarnMock.mock.resetCalls();
}

/** Make spawn succeed (exit 0). */
function spawnSucceeds() {
  spawnMock.mock.mockImplementation(() => {
    const child = new ChildProcess();
    child.stderr = new PassThrough();
    child.stdout = new PassThrough();
    process.nextTick(() => child.emit("close", 0));
    return child;
  });
}

/** Make spawn fail (exit 1). */
function spawnFails() {
  spawnMock.mock.mockImplementation(() => {
    const child = new ChildProcess();
    child.stderr = new PassThrough();
    child.stdout = new PassThrough();
    process.nextTick(() => child.emit("close", 1));
    return child;
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("initSupabase", () => {
  it("runs npx supabase init in the project directory", async () => {
    resetMocks();
    spawnSucceeds();

    await initSupabase("/tmp/test-project");

    assert.equal(spawnMock.mock.callCount(), 1);
    const [cmd, args, opts] = spawnMock.mock.calls[0].arguments;
    assert.equal(cmd, "npx");
    assert.deepEqual(args, ["supabase", "init"]);
    assert.equal(opts.cwd, "/tmp/test-project");
  });

  it("shows a spinner while running", async () => {
    resetMocks();
    spawnSucceeds();

    await initSupabase("/tmp/test-project");

    assert.equal(spinnerStartMock.mock.callCount(), 1);
    assert.equal(spinnerStopMock.mock.callCount(), 1);
    assert.ok(
      spinnerStopMock.mock.calls[0].arguments[0].includes("Supabase"),
      "spinner stop message should indicate success",
    );
  });

  it("does not throw when supabase init fails", async () => {
    resetMocks();
    spawnFails();

    await assert.doesNotReject(() => initSupabase("/tmp/test-project"));
  });

  it("warns the user when supabase init fails", async () => {
    resetMocks();
    spawnFails();

    await initSupabase("/tmp/test-project");

    assert.equal(logWarnMock.mock.callCount(), 1);
    const warnMsg = logWarnMock.mock.calls[0].arguments[0];
    assert.ok(
      warnMsg.includes("supabase init"),
      "warning should mention supabase init",
    );
  });
});
