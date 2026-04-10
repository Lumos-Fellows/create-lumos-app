import { readdirSync, renameSync, rmdirSync } from "node:fs";
import { basename, join } from "node:path";
import * as p from "@clack/prompts";
import { isCurrentDir, run } from "./utils.mjs";

/**
 * Run the base scaffolding tool (create-next-app or create-expo-app).
 *
 * When scaffolding in-place (name === ".") and the current directory name
 * isn't a valid npm package name (e.g. uppercase "DemoApp"), create-next-app
 * and create-expo-app reject it outright. Work around this by scaffolding
 * into a temp subdirectory with the sanitized name, then moving everything up.
 */
export async function scaffold(options) {
  const { name, framework, packageManager } = options;

  const inPlace = isCurrentDir(name);
  const needsTempDir =
    inPlace && basename(process.cwd()) !== options.resolvedName;
  const scaffoldTarget = needsTempDir ? options.resolvedName : name;

  const s = p.spinner();

  if (framework === "nextjs") {
    s.start("Running create-next-app…");
    const pmFlag = packageManager === "pnpm" ? "--use-pnpm" : "--use-npm";
    await run("npx", [
      "create-next-app@latest",
      scaffoldTarget,
      "--app",
      "--tailwind",
      "--no-eslint",
      "--src-dir",
      "--import-alias",
      "~/*",
      "--ts",
      pmFlag,
      "--yes",
    ]);
    s.stop("Next.js project created");
  } else {
    s.start("Running create-expo-app…");
    if (packageManager === "pnpm") {
      await run("pnpm", [
        "create",
        "expo-app@latest",
        scaffoldTarget,
        "--template",
        "tabs",
        "--yes",
      ]);
    } else {
      await run("npx", [
        "create-expo-app@latest",
        scaffoldTarget,
        "--template",
        "tabs",
        "--yes",
      ]);
    }
    s.stop("Expo project created");
  }

  // Move scaffolded files from the temp subdirectory into the current directory
  if (needsTempDir) {
    const tempDir = join(process.cwd(), scaffoldTarget);
    for (const entry of readdirSync(tempDir)) {
      renameSync(join(tempDir, entry), join(process.cwd(), entry));
    }
    rmdirSync(tempDir);
  }
}
