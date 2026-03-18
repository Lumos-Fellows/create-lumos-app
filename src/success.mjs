import * as p from "@clack/prompts";
import pc from "picocolors";

/**
 * Print the success message with next steps.
 */
export function printSuccess(options) {
  const { name, framework, packageManager } = options;
  const pm = packageManager;
  const isNext = framework === "nextjs";

  const steps = [
    `cd ${name}`,
    "cp .env.example .env.local",
    "# Fill in your env vars in .env.local",
    isNext ? `${pm === "pnpm" ? "pnpm" : "npm run"} dev` : "npx expo start",
  ];

  p.note(steps.join("\n"), "Next steps");

  p.outro(
    `${pc.green("Done!")} Your ${pc.cyan(isNext ? "Next.js" : "Expo")} app is ready at ${pc.cyan(`./${name}`)}`,
  );
}
