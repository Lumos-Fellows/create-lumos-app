import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { signalProcessTree } from "../../scripts/dev/actions.ts";

async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return z.object({ port: z.number() }).parse(server.address()).port;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function startNext(project: string, dsn: string) {
  const reservation = createServer();
  const port = await listen(reservation);
  await close(reservation);
  const next = join(project, "node_modules/next/dist/bin/next");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEXT_PUBLIC_SENTRY_DSN: dsn,
  };
  for (const key of Object.keys(env)) {
    if (/SUPABASE|POSTHOG|SKIP_ENV_VALIDATION|SENTRY_AUTH_TOKEN/.test(key))
      delete env[key];
  }
  const child = spawn(
    process.execPath,
    [next, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: project,
      env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  child.stdout.on("data", (chunk: Buffer) => {
    log += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    log += chunk.toString();
  });
  child.on("error", (error) => {
    log += error.message;
  });
  const url = `http://127.0.0.1:${port}`;
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    await signalProcessTree(child, true);
    await exited;
  }
  try {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(log);
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30_000),
        });
        assert.equal(response.status, 200, log + (await response.text()));
        return { url, stop, log: () => log };
      } catch (error) {
        if (error instanceof assert.AssertionError) throw error;
        await setTimeout(200);
      }
    }
    throw new Error(`Next.js did not become ready.\n${log}`);
  } catch (error) {
    await stop();
    throw error;
  }
}

export async function verifySentryRuntime(project: string) {
  const route = join(project, "src/app/monitoring-smoke");
  const marker = "create-lumos-sentry-runtime-check";
  mkdirSync(route, { recursive: true });
  writeFileSync(
    join(route, "route.ts"),
    `export function GET() { throw new Error("${marker}"); }\n`,
  );
  const envelopes: string[] = [];
  const collector = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      envelopes.push(
        (request.headers["content-encoding"] === "gzip"
          ? gunzipSync(body)
          : body
        ).toString(),
      );
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.end("{}");
    });
  });
  const port = await listen(collector);
  try {
    for (const dsn of ["", `http://public@127.0.0.1:${port}/1`]) {
      const app = await startNext(project, dsn);
      try {
        const response = await fetch(`${app.url}/monitoring-smoke`, {
          signal: AbortSignal.timeout(60_000),
        });
        assert.equal(response.status, 500, app.log());
        if (dsn) {
          const deadline = Date.now() + 15_000;
          while (
            !envelopes.some((envelope) => envelope.includes(marker)) &&
            Date.now() < deadline
          )
            await setTimeout(100);
          assert.ok(
            envelopes.some((envelope) => envelope.includes(marker)),
            `Sentry did not send the server error.\n${app.log()}`,
          );
        } else {
          assert.equal(envelopes.length, 0);
        }
      } finally {
        await app.stop();
      }
    }
  } finally {
    await close(collector);
    rmSync(route, { recursive: true, force: true });
  }
}
