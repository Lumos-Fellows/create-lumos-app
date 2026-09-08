import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, test } from "node:test";
import { projectInput, stateSchema } from "../scripts/dev/contracts.ts";
import { listFiles, readFile, workspacePath } from "../scripts/dev/files.ts";

const root = mkdtempSync(join(tmpdir(), "lumos-playground-"));
after(() => rmSync(root, { recursive: true, force: true }));

const input = {
  name: "my-test",
  framework: "nextjs",
  template: "bare",
  packageManager: "pnpm",
  components: false,
  supabase: false,
  posthog: false,
  sentry: false,
};

test("project requests reject paths, shell syntax, and unsupported options", () => {
  assert.equal(projectInput.parse(input).name, "my-test");
  for (const name of [
    ".",
    "../escape",
    "/tmp/app",
    "a\\b",
    "x;touch pwned",
    "",
    "a".repeat(65),
  ]) {
    assert.equal(projectInput.safeParse({ ...input, name }).success, false);
  }
  assert.equal(
    projectInput.safeParse({ ...input, framework: "other" }).success,
    false,
  );
  assert.equal(
    projectInput.safeParse({ ...input, supabase: "false" }).success,
    false,
  );
});

test("file browser lists source and guidance while hiding dependencies and build output", () => {
  const project = join(root, "app");
  mkdirSync(project);
  for (const name of ["node_modules", ".git", ".next", "src", ".agents"])
    mkdirSync(join(project, name));
  writeFileSync(join(project, "AGENTS.md"), "Shared guidance");
  assert.deepEqual(
    listFiles(root, "app").map((entry) => entry.name),
    [".agents", "src", "AGENTS.md"],
  );
  assert.equal(readFile(root, "app/AGENTS.md"), "Shared guidance");
});

test("file browser rejects traversal, hidden directories, large and binary files", () => {
  for (const path of [
    "../outside",
    "/tmp",
    "app/../../",
    "app\\outside",
    "app/.git",
    "app/node_modules",
    "C:/file",
  ]) {
    assert.throws(() => workspacePath(root, path));
  }
  writeFileSync(join(root, "binary"), Buffer.from([0, 1, 2]));
  writeFileSync(join(root, "large"), "a".repeat(512_001));
  assert.throws(() => readFile(root, "binary"), /Binary/);
  assert.throws(() => readFile(root, "large"), /512 KB/);
});

test("file browser refuses symlinks to files, directories, and workspace roots", {
  skip: process.platform === "win32",
}, () => {
  symlinkSync(tmpdir(), join(root, "outside"));
  symlinkSync(join(root, "binary"), join(root, "linked-file"));
  assert.throws(() => workspacePath(root, "outside"), /Symbolic/);
  assert.throws(() => readFile(root, "linked-file"), /Symbolic/);
  assert.throws(
    () => workspacePath(join(root, "outside"), ""),
    /real directory/,
  );
  assert.equal(
    listFiles(root, "").some((entry) => entry.name === "outside"),
    false,
  );
});

const fakeBin = join(root, "fake-bin");
mkdirSync(fakeBin);
writeFileSync(
  join(fakeBin, process.platform === "win32" ? "git.cmd" : "git"),
  process.platform === "win32" ? "@exit /b 42\r\n" : "#!/bin/sh\nexit 42\n",
  { mode: 0o755 },
);
const workspace = join(root, "workspace");
mkdirSync(workspace);
const failedName = `playground-test-${process.pid}`;
const server = spawn(
  process.execPath,
  ["--import", "tsx", "scripts/dev/server.ts"],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      LUMOS_PLAYGROUND_DIR: workspace,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
    },
  },
);
let origin = "";
before(async () => {
  origin = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Playground did not start")),
      10_000,
    );
    server.stdout.on("data", (data: Buffer) => {
      const url = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
    server.on("error", reject);
    server.on("exit", () => {
      clearTimeout(timeout);
      reject(new Error("Playground exited before startup"));
    });
  });
});
after(async () => {
  const closed = once(server, "close");
  server.kill();
  await closed;
});

test("local API rejects foreign origins, hosts, malformed input, and traversal", async () => {
  const state = await fetch(`${origin}/api/state`);
  assert.equal(state.status, 200);
  stateSchema.parse(await state.json());
  const foreignHostStatus = await new Promise<number | undefined>(
    (resolve, reject) => {
      get(
        `${origin}/api/state`,
        { headers: { Host: "attacker.example" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      ).on("error", reject);
    },
  );
  assert.equal(foreignHostStatus, 403);
  const requests: [string, RequestInit, number][] = [
    ["/api/state", { headers: { Origin: "https://attacker.example" } }, 403],
    [
      "/api/projects",
      {
        method: "POST",
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
      },
      403,
    ],
    [
      "/api/projects",
      {
        method: "POST",
        body: JSON.stringify({ ...input, name: "../escape" }),
        headers: { Origin: origin, "Content-Type": "application/json" },
      },
      400,
    ],
    ["/api/file?path=../package.json", {}, 400],
  ];
  for (const [path, options, expected] of requests) {
    const response = await fetch(`${origin}${path}`, options);
    assert.equal(response.status, expected, path);
    await response.text();
  }
});

test("creation failures are reported and existing folders are preserved", async () => {
  const options = {
    method: "POST",
    body: JSON.stringify({ ...input, name: failedName }),
    headers: { Origin: origin, "Content-Type": "application/json" },
  };
  const response = await fetch(`${origin}/api/projects`, options);
  assert.equal(response.status, 202);
  await response.text();
  let state = stateSchema.parse(
    await (await fetch(`${origin}/api/state`)).json(),
  );
  const deadline = Date.now() + 10_000;
  while (state.job?.status === "running" && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    state = stateSchema.parse(
      await (await fetch(`${origin}/api/state`)).json(),
    );
  }
  assert.equal(state.job?.status, "failed");
  assert.match(state.job.log, /git exited with code 42/);
  const duplicate = await fetch(`${origin}/api/projects`, options);
  assert.equal(duplicate.status, 409);
  await duplicate.text();
});
after(() =>
  rmSync(join(workspace, failedName), { recursive: true, force: true }),
);

interface CommandRequest {
  name: string;
  command: string;
}

async function api(path: string, method = "GET", body?: CommandRequest) {
  return fetch(origin + path, {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function waitForJob(predicate: (log: string, status: string) => boolean) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const state = stateSchema.parse(await (await api("/api/state")).json());
    if (state.job && predicate(state.job.log, state.job.status))
      return state.job;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Command did not reach the expected state.");
}

test("project commands stream output, stop the server tree, and gate deletion", async () => {
  const project = join(workspace, "commands");
  mkdirSync(project);
  writeFileSync(
    join(project, "package.json"),
    JSON.stringify({
      scripts: {
        dev: "node server.cjs",
        lint: 'node -e "process.exit(7)"',
        deploy: "echo forbidden",
      },
    }),
  );
  writeFileSync(
    join(project, "server.cjs"),
    'const http = require("node:http"); const s = http.createServer((q,r) => r.end("works")); s.listen(0, "127.0.0.1", () => console.log("PORT=" + s.address().port));',
  );
  assert.deepEqual(await (await api("/api/commands?project=commands")).json(), [
    "dev",
    "lint",
  ]);
  assert.equal(
    (await api("/api/commands", "POST", { name: "../escape", command: "dev" }))
      .status,
    400,
  );
  assert.equal(
    (
      await api("/api/commands", "POST", {
        name: "commands",
        command: "deploy",
      })
    ).status,
    400,
  );
  assert.equal(
    (await api("/api/commands", "POST", { name: "commands", command: "build" }))
      .status,
    400,
  );
  assert.equal(
    (await api("/api/commands", "POST", { name: "commands", command: "dev" }))
      .status,
    202,
  );
  const job = await waitForJob((log) => /PORT=\d+/.test(log));
  const port = job.log.match(/PORT=(\d+)/)?.[1];
  const appUrl = `http://127.0.0.1:${port}`;
  assert.equal(await (await fetch(appUrl)).text(), "works");
  assert.equal((await api("/api/projects", "DELETE")).status, 409);
  assert.equal(
    (await api("/api/commands", "POST", { name: "commands", command: "lint" }))
      .status,
    409,
  );
  assert.equal((await api("/api/stop", "POST")).status, 200);
  await assert.rejects(fetch(appUrl));
  await waitForJob((_log, status) => status === "stopped");
  assert.equal(
    (await api("/api/commands", "POST", { name: "commands", command: "lint" }))
      .status,
    202,
  );
  await waitForJob((_log, status) => status === "failed");
  const outside = join(root, "keep");
  mkdirSync(outside);
  writeFileSync(join(outside, "keep.txt"), "keep");
  if (process.platform !== "win32")
    symlinkSync(outside, join(project, "outside"));
  assert.equal(
    (await fetch(`${origin}/api/projects`, { method: "DELETE" })).status,
    403,
  );
  assert.equal(existsSync(project), true);
  assert.equal((await api("/api/projects", "DELETE")).status, 200);
  assert.equal(existsSync(join(outside, "keep.txt")), true);
  assert.equal(existsSync(project), false);
  assert.deepEqual(await (await api("/api/state")).json(), {
    projects: [],
    job: null,
  });
});
