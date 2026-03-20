import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

const SHADCN_COMPONENTS = [
  "button",
  "card",
  "input",
  "label",
  "badge",
  "separator",
  "skeleton",
];

export async function installShadcn(projectPath) {
  const s = p.spinner();
  s.start("Installing shadcn/ui components…");
  try {
    await run("npx", ["shadcn@latest", "add", ...SHADCN_COMPONENTS, "--yes"], {
      cwd: projectPath,
    });
    s.stop("shadcn/ui components installed");
  } catch (err) {
    s.stop("shadcn/ui install failed — run `npx shadcn add` manually");
    p.log.warn(err.message);
  }
}
