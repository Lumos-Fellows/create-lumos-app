import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { deleteProjects, projectCommands } from "./actions.ts";
import {
  type ApiResponse,
  commandInput,
  type Job,
  projectInput,
  projectName,
} from "./contracts.ts";
import { listFiles, readFile, workspacePath } from "./files.ts";
import { Jobs } from "./jobs.ts";

const directory = dirname(fileURLToPath(import.meta.url));
const repo = join(directory, "../..");
const workspace = process.env.LUMOS_PLAYGROUND_DIR ?? join(repo, ".playground");
mkdirSync(workspace, { recursive: true });
workspacePath(workspace, "");
const jobs = new Jobs();
const addressSchema = z.object({ port: z.number() });

async function readInput(request: IncomingMessage) {
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 8192) throw new Error("Request is too large.");
  }
  const input: unknown = JSON.parse(body);
  return input;
}

const server = createServer(async (request, response) => {
  const address = addressSchema.parse(server.address());
  const origin = `http://127.0.0.1:${address.port}`;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  // Browser annotation tools inject inline styles for their overlays and cursors.
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
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
          job: jobs.current,
        });
        return;
      }
      if (url.pathname === "/api/commands") {
        const name = projectName.parse(url.searchParams.get("project"));
        json(200, projectCommands(workspace, name).commands);
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
    if (request.method === "POST" || request.method === "DELETE") {
      if (
        request.headers.origin !== origin ||
        request.headers["content-type"] !== "application/json"
      ) {
        json(403, { error: "Use the local dashboard for this action." });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/stop") {
        await jobs.stop();
        json(200, {
          projects: listFiles(workspace, "")
            .filter((entry) => entry.directory)
            .map((entry) => entry.name),
          job: jobs.current,
        });
        return;
      }
      // Check the lock after reading input, without yielding between the check and launch.
      const input = request.method === "POST" ? await readInput(request) : null;
      if (jobs.busy) {
        json(409, {
          error: "Stop the running command or wait for it to finish.",
        });
        return;
      }
      if (request.method === "DELETE" && url.pathname === "/api/projects") {
        deleteProjects(workspace);
        jobs.current = null;
        json(200, { projects: [], job: null });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/commands") {
        const command = commandInput.parse(input);
        const project = projectCommands(workspace, command.name);
        if (!project.commands.includes(command.command))
          throw new Error(
            "This script is not available in the selected project.",
          );
        const current: Job = {
          name: command.name,
          command: command.command,
          status: "running",
          log: `$ ${project.manager} run ${command.command}\n`,
        };
        jobs.launch(
          current,
          project.manager,
          ["run", command.command],
          project.directory,
        );
        json(202, current);
        return;
      }
      if (request.method !== "POST" || url.pathname !== "/api/projects") {
        json(404, { error: "Not found." });
        return;
      }
      const project = projectInput.parse(input);
      workspacePath(workspace, "");
      if (existsSync(join(workspace, project.name))) {
        json(409, {
          error: "That folder already exists. Choose a new project name.",
        });
        return;
      }
      const current: Job = {
        name: project.name,
        command: "create",
        status: "running",
        log: `Creating ${project.name}…\n`,
      };
      jobs.launch(
        current,
        process.execPath,
        [
          "--import",
          import.meta.resolve("tsx"),
          join(directory, "create.ts"),
          JSON.stringify(project),
        ],
        workspace,
      );
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

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void jobs.stop().then(() => server.close(() => process.exit(0)));
  });
}
