/**
 * Unit tests for skills installation.
 *
 * Usage: node --experimental-test-module-mocks --test test/skills.test.mjs
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { describe, it, mock } from "node:test";

// ── Mocks ────────────────────────────────────────────────────────────────────

const spawnMock = mock.fn();
mock.module("node:child_process", {
  namedExports: {
    spawn: spawnMock,
    execSync: () => "",
  },
});

const multiselectMock = mock.fn();
const spinnerStopMock = mock.fn();
const spinnerStartMock = mock.fn();

mock.module("@clack/prompts", {
  namedExports: {
    multiselect: multiselectMock,
    isCancel: (v) => v === Symbol.for("cancel"),
    spinner: () => ({ start: spinnerStartMock, stop: spinnerStopMock }),
    log: {
      step: mock.fn(),
      info: mock.fn(),
      success: mock.fn(),
      warn: mock.fn(),
    },
  },
});

const { installSkills, DEFAULT_SKILLS } = await import("../src/skills.mjs");

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetMocks() {
  spawnMock.mock.resetCalls();
  multiselectMock.mock.resetCalls();
  spinnerStopMock.mock.resetCalls();
}

/** Make spawn succeed (exit 0) for every call. */
function spawnSucceeds() {
  spawnMock.mock.mockImplementation(() => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stderr.on = () => child.stderr;
    child.stdout = { resume: () => {} };
    process.nextTick(() => child.emit("close", 0));
    return child;
  });
}

/** Make spawn fail (exit 1) for every call. */
function spawnFails() {
  spawnMock.mock.mockImplementation(() => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stderr.on = () => child.stderr;
    child.stdout = { resume: () => {} };
    process.nextTick(() => child.emit("close", 1));
    return child;
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DEFAULT_SKILLS", () => {
  it("contains the three recommended skills", () => {
    assert.equal(DEFAULT_SKILLS.length, 3);

    const skills = DEFAULT_SKILLS.map((s) => s.skill);
    assert.ok(skills.includes("vercel-react-best-practices"));
    assert.ok(skills.includes("next-best-practices"));
    assert.ok(skills.includes("skill-creator"));
  });
});

describe("installSkills", () => {
  it("installs each selected skill with correct args", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(DEFAULT_SKILLS),
    );
    spawnSucceeds();

    await installSkills("/tmp/test-project");

    assert.equal(spawnMock.mock.callCount(), 3);

    for (let i = 0; i < DEFAULT_SKILLS.length; i++) {
      const [cmd, args, opts] = spawnMock.mock.calls[i].arguments;
      assert.equal(cmd, "npx");
      assert.deepEqual(args, [
        "skills",
        "add",
        DEFAULT_SKILLS[i].source,
        "--skill",
        DEFAULT_SKILLS[i].skill,
        "-y",
      ]);
      assert.equal(opts.cwd, "/tmp/test-project");
    }
  });

  it("installs only the skills the user selects", async () => {
    resetMocks();
    const subset = [DEFAULT_SKILLS[1]];
    multiselectMock.mock.mockImplementation(() => Promise.resolve(subset));
    spawnSucceeds();

    await installSkills("/tmp/test-project");

    assert.equal(spawnMock.mock.callCount(), 1);
    const [, args] = spawnMock.mock.calls[0].arguments;
    assert.deepEqual(args, [
      "skills",
      "add",
      DEFAULT_SKILLS[1].source,
      "--skill",
      DEFAULT_SKILLS[1].skill,
      "-y",
    ]);
  });

  it("skips installation when user cancels", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(Symbol.for("cancel")),
    );

    await installSkills("/tmp/test-project");

    assert.equal(spawnMock.mock.callCount(), 0);
  });

  it("skips installation when user selects nothing", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() => Promise.resolve([]));

    await installSkills("/tmp/test-project");

    assert.equal(spawnMock.mock.callCount(), 0);
  });

  it("does not throw when a skill fails to install", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(DEFAULT_SKILLS),
    );
    spawnFails();

    await assert.doesNotReject(() => installSkills("/tmp/test-project"));

    // All three were attempted despite failures
    assert.equal(spawnMock.mock.callCount(), 3);
  });

  it("reports which skills failed", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(DEFAULT_SKILLS),
    );

    let callIdx = 0;
    spawnMock.mock.mockImplementation(() => {
      const child = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stderr.on = () => child.stderr;
      child.stdout = { resume: () => {} };
      const code = callIdx === 1 ? 1 : 0; // second skill fails
      callIdx++;
      process.nextTick(() => child.emit("close", code));
      return child;
    });

    await installSkills("/tmp/test-project");

    const stopMsg = spinnerStopMock.mock.calls[0].arguments[0];
    assert.ok(
      stopMsg.includes(DEFAULT_SKILLS[1].label),
      `stop message should mention failed skill: ${stopMsg}`,
    );
  });
});
