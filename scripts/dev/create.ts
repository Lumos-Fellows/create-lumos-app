import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { createProject } from "../../src/index.ts";
import { run } from "../../src/utils.ts";
import { projectInput } from "./contracts.ts";

const input = projectInput.parse(JSON.parse(process.argv[2] ?? "{}"));
const target = join(process.cwd(), input.name);
try {
  mkdirSync(target);
  // An independent Git root prevents linters from inheriting /.playground/.
  await run("git", ["init"], { cwd: target });
  process.chdir(target);
  await createProject({
    ...input,
    name: ".",
    template: input.framework === "expo" ? "bare" : input.template,
    shadcn: input.framework === "nextjs" && input.components,
    rnr: input.framework === "expo" && input.components,
    skills: false,
  });
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
