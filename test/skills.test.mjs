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

const {
  installSkills,
  selectSkills,
  NEXTJS_SKILLS,
  EXPO_SKILLS,
  INTEGRATION_SKILLS,
  getSkillsForFramework,
} = await import("../src/skills.mjs");

// ── Helpers ──────────────────────────────────────────────────────────────────

function resetMocks() {
  spawnMock.mock.resetCalls();
  multiselectMock.mock.resetCalls();
  spinnerStartMock.mock.resetCalls();
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

describe("NEXTJS_SKILLS", () => {
  it("contains the three recommended Next.js skills", () => {
    assert.equal(NEXTJS_SKILLS.length, 3);

    const skills = NEXTJS_SKILLS.map((s) => s.skill);
    assert.ok(skills.includes("vercel-react-best-practices"));
    assert.ok(skills.includes("next-best-practices"));
    assert.ok(skills.includes("skill-creator"));
  });
});

describe("EXPO_SKILLS", () => {
  it("contains the two recommended Expo skills", () => {
    assert.equal(EXPO_SKILLS.length, 2);

    const skills = EXPO_SKILLS.map((s) => s.skill);
    assert.ok(skills.includes("vercel-react-native-skills"));
    assert.ok(skills.includes("expo-dev-client"));
  });
});

describe("getSkillsForFramework", () => {
  it("returns Next.js skills for nextjs", () => {
    assert.deepEqual(getSkillsForFramework("nextjs"), NEXTJS_SKILLS);
  });

  it("returns Expo skills for expo", () => {
    assert.deepEqual(getSkillsForFramework("expo"), EXPO_SKILLS);
  });

  it("includes Supabase skill when supabase is enabled", () => {
    const skills = getSkillsForFramework("nextjs", { supabase: true });
    assert.equal(skills.length, NEXTJS_SKILLS.length + 1);
    assert.ok(skills.some((s) => s.source === "supabase/agent-skills"));
  });

  it("does not include Supabase skill when supabase is disabled", () => {
    const skills = getSkillsForFramework("nextjs", { supabase: false });
    assert.deepEqual(skills, NEXTJS_SKILLS);
  });
});

describe("selectSkills", () => {
  it("returns selected skills from multiselect", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(NEXTJS_SKILLS),
    );

    const result = await selectSkills("nextjs");
    assert.deepEqual(result, NEXTJS_SKILLS);
  });

  it("returns null when user cancels", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() =>
      Promise.resolve(Symbol.for("cancel")),
    );

    const result = await selectSkills("nextjs");
    assert.equal(result, null);
  });

  it("returns null when user selects nothing", async () => {
    resetMocks();
    multiselectMock.mock.mockImplementation(() => Promise.resolve([]));

    const result = await selectSkills("nextjs");
    assert.equal(result, null);
  });
});

describe("installSkills", () => {
  it("installs each selected skill with correct args", async () => {
    resetMocks();
    spawnSucceeds();

    await installSkills("/tmp/test-project", NEXTJS_SKILLS);

    assert.equal(spawnMock.mock.callCount(), 3);

    for (let i = 0; i < NEXTJS_SKILLS.length; i++) {
      const [cmd, args, opts] = spawnMock.mock.calls[i].arguments;
      assert.equal(cmd, "npx");
      assert.deepEqual(args, [
        "skills",
        "add",
        NEXTJS_SKILLS[i].source,
        "--skill",
        NEXTJS_SKILLS[i].skill,
        "-y",
      ]);
      assert.equal(opts.cwd, "/tmp/test-project");
    }
  });

  it("omits --skill flag for skills without a skill property", async () => {
    resetMocks();
    spawnSucceeds();

    await installSkills("/tmp/test-project", [INTEGRATION_SKILLS.supabase]);

    assert.equal(spawnMock.mock.callCount(), 1);
    const [cmd, args] = spawnMock.mock.calls[0].arguments;
    assert.equal(cmd, "npx");
    assert.deepEqual(args, ["skills", "add", "supabase/agent-skills", "-y"]);
  });

  it("installs only the skills passed in", async () => {
    resetMocks();
    const subset = [NEXTJS_SKILLS[1]];
    spawnSucceeds();

    await installSkills("/tmp/test-project", subset);

    assert.equal(spawnMock.mock.callCount(), 1);
    const [, args] = spawnMock.mock.calls[0].arguments;
    assert.deepEqual(args, [
      "skills",
      "add",
      NEXTJS_SKILLS[1].source,
      "--skill",
      NEXTJS_SKILLS[1].skill,
      "-y",
    ]);
  });

  it("does not throw when a skill fails to install", async () => {
    resetMocks();
    spawnFails();

    await assert.doesNotReject(() =>
      installSkills("/tmp/test-project", NEXTJS_SKILLS),
    );

    // All three were attempted despite failures
    assert.equal(spawnMock.mock.callCount(), 3);
  });

  it("reports which skills failed", async () => {
    resetMocks();

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

    await installSkills("/tmp/test-project", NEXTJS_SKILLS);

    const stopMsg = spinnerStopMock.mock.calls[0].arguments[0];
    assert.ok(
      stopMsg.includes(NEXTJS_SKILLS[1].label),
      `stop message should mention failed skill: ${stopMsg}`,
    );
  });
});
