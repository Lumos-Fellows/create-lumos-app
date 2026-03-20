import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Run the base scaffolding tool (create-next-app or create-expo-app).
 */
export async function scaffold(options) {
  const { name, framework, packageManager } = options;

  const s = p.spinner();

  if (framework === "nextjs") {
    s.start("Running create-next-app…");
    const pmFlag = packageManager === "pnpm" ? "--use-pnpm" : "--use-npm";
    await run("npx", [
      "create-next-app@latest",
      name,
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
        name,
        "--template",
        "tabs",
        "--yes",
      ]);
    } else {
      await run("npx", [
        "create-expo-app@latest",
        name,
        "--template",
        "tabs",
        "--yes",
      ]);
    }
    s.stop("Expo project created");
  }
}
