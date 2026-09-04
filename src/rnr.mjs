import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

const RNR_COMPONENTS = [
  "button",
  "card",
  "input",
  "label",
  "badge",
  "separator",
  "skeleton",
  "text",
];

function documentWebTextRoles(projectPath) {
  const textPath = join(projectPath, "components", "ui", "text.tsx");
  let source = readFileSync(textPath, "utf-8");
  for (const role of ["blockquote", "code"]) {
    const explanation = `// SAFETY: The ${role} ARIA role is web-only; Platform.select excludes it on native, whose Role type omits it.`;
    if (source.includes(explanation)) continue;
    // Match only RNR's web-only role casts, leaving other assertions for review.
    const property = new RegExp(
      `^([\\t ]*)${role}: Platform\\.select\\(\\{ web: (["'])${role}\\2 as Role \\}\\),$`,
      "gm",
    );
    source = source.replace(property, `$1${explanation}\n$&`);
  }
  writeFileSync(textPath, source);
}

export async function installRnr(projectPath) {
  const s = p.spinner();
  s.start("Installing React Native Reusables components…");
  try {
    await run(
      "npx",
      ["@react-native-reusables/cli@latest", "add", ...RNR_COMPONENTS, "--yes"],
      { cwd: projectPath },
    );
    documentWebTextRoles(projectPath);
    s.stop("React Native Reusables components installed");
  } catch (err) {
    s.stop(
      "RNR install failed — run `npx @react-native-reusables/cli add` manually",
    );
    p.log.warn(err.message);
  }
}
