import * as p from "@clack/prompts";
import pc from "picocolors";
import { isCurrentDir } from "./utils.mjs";

/**
 * Print the success message with next steps.
 */
export function printSuccess(options) {
  const { name, framework, packageManager } = options;
  const pm = packageManager;
  const isNext = framework === "nextjs";
  const inPlace = isCurrentDir(name);

  const steps = [
    ...(inPlace ? [] : [`cd ${name}`]),
    "# Fill in your env vars in .env.local",
    isNext ? `${pm === "pnpm" ? "pnpm" : "npm run"} dev` : "npx expo start",
  ];

  p.note(steps.join("\n"), "Next steps");

  const location = inPlace
    ? pc.cyan("the current directory")
    : pc.cyan(`./${name}`);
  p.outro(
    `${pc.green("Done!")} Your ${pc.cyan(isNext ? "Next.js" : "Expo")} app is ready in ${location}`,
  );
}
