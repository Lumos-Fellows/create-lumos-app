import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { z } from "zod";
import { type ApiResponse, type Job, projectInput } from "./contracts.ts";
import { listFiles, readFile, workspacePath } from "./files.ts";

const directory = dirname(fileURLToPath(import.meta.url));
const repo = join(directory, "../..");
const workspace = join(repo, ".playground");
mkdirSync(workspace, { recursive: true });
workspacePath(workspace, "");
let job: Job | null = null;
const addressSchema = z.object({ port: z.number() });

async function readInput(request: IncomingMessage) {
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 8192) throw new Error("Request is too large.");
  }
  return projectInput.parse(JSON.parse(body));
}

const server = createServer(async (request, response) => {
  const address = addressSchema.parse(server.address());
  const origin = `http://127.0.0.1:${address.port}`;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'",
  );
  const json = (status: number, value: ApiResponse) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(value));
  };
  if (
    request.headers.host !== `127.0.0.1:${address.port}` ||
    (request.headers.origin && request.headers.origin !== origin)
  ) {
    json(403, { error: "Open the dashboard using its printed local URL." });
    return;
  }
  try {
    const url = new URL(request.url ?? "/", origin);
    if (request.method === "GET") {
      if (url.pathname === "/api/state") {
        json(200, {
          projects: listFiles(workspace, "")
            .filter((entry) => entry.directory)
            .map((entry) => entry.name),
          job,
        });
        return;
      }
      if (url.pathname === "/api/tree") {
        json(200, listFiles(workspace, url.searchParams.get("path") ?? ""));
        return;
      }
      if (url.pathname === "/api/file") {
        const content = readFile(workspace, url.searchParams.get("path") ?? "");
        response.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end(content);
        return;
      }
      const assets = new Map([
        ["/", [join(directory, "index.html"), "text/html; charset=utf-8"]],
        ["/style.css", [join(directory, "style.css"), "text/css"]],
        ["/client.js", [join(repo, "dist/dev/client.js"), "text/javascript"]],
      ]);
      const asset = assets.get(url.pathname);
      if (asset) {
        response.writeHead(200, { "Content-Type": asset[1] });
        response.end(readFileSync(asset[0]));
        return;
      }
    }
    if (request.method === "POST" && url.pathname === "/api/projects") {
      if (
        request.headers.origin !== origin ||
        request.headers["content-type"] !== "application/json"
      ) {
        json(403, { error: "Create projects through the local dashboard." });
        return;
      }
      const input = await readInput(request);
      if (job?.status === "running") {
        json(409, { error: "Wait for the current project to finish." });
        return;
      }
      workspacePath(workspace, "");
      if (existsSync(join(workspace, input.name))) {
        json(409, {
          error: "That folder already exists. Choose a new project name.",
        });
        return;
      }
      const current: Job = {
        name: input.name,
        status: "running",
        log: `Creating ${input.name}…\n`,
      };
      job = current;
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          join(directory, "create.ts"),
          JSON.stringify(input),
        ],
        {
          cwd: workspace,
          env: { ...process.env, CI: "true", SUPABASE_TELEMETRY_DISABLED: "1" },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const append = (data: Buffer) => {
        current.log = (
          current.log + stripVTControlCharacters(data.toString())
        ).slice(-100_000);
      };
      child.stdout.on("data", append);
      child.stderr.on("data", append);
      child.on("error", (error) => {
        current.status = "failed";
        current.log += `\n${error.message}`;
      });
      child.on("close", (code) => {
        current.status = code === 0 ? "ready" : "failed";
        current.log +=
          code === 0
            ? "\nProject ready. Select a file to inspect it."
            : "\nCreation failed. See the log above; partial files are kept for inspection. Retry with a new name.";
      });
      json(202, current);
      return;
    }
    json(404, { error: "Not found." });
  } catch (error) {
    json(400, { error: String(error) });
  }
});

server.listen(0, "127.0.0.1", () => {
  const address = addressSchema.parse(server.address());

  console.log(
    `\nLumos playground: http://127.0.0.1:${address.port}\nProjects: ${workspace}\n`,
  );
});
