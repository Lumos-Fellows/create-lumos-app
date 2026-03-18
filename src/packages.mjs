import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getEnvVars, getIntegrationDeps } from "./integrations.mjs";
import { readJson, run, writeJson } from "./utils.mjs";

/**
 * Modify package.json, assemble .env.example, and install dependencies.
 */
export async function setupPackages(projectPath, options) {
  const { framework, packageManager, supabase, posthog, sentry } = options;
  const pkgPath = join(projectPath, "package.json");
  const pkg = readJson(pkgPath);

  // Add scripts
  pkg.scripts = {
    ...pkg.scripts,
    format: "biome format --write .",
    lint: "biome check .",
    typecheck: "tsc --noEmit",
  };

  // Enforce pnpm if selected
  if (packageManager === "pnpm") {
    pkg.scripts.preinstall = "npx only-allow pnpm";
  }

  writeJson(pkgPath, pkg);

  // Collect all deps to install
  const baseDeps =
    framework === "nextjs"
      ? [
          "clsx",
          "tailwind-merge",
          "class-variance-authority",
          "@t3-oss/env-nextjs",
          "zod",
        ]
      : ["clsx", "tailwind-merge", "zod"];

  const baseDevDeps =
    framework === "nextjs"
      ? ["@biomejs/biome", "@radix-ui/react-slot"]
      : ["@biomejs/biome"];

  const integrationOpts = { supabase, posthog, sentry };
  const { deps: intDeps, devDeps: intDevDeps } = getIntegrationDeps(
    framework,
    integrationOpts,
  );

  const allDeps = [...baseDeps, ...intDeps];
  const allDevDeps = [...baseDevDeps, ...intDevDeps];

  const addArg = packageManager === "pnpm" ? "add" : "install";

  // Install production deps
  const s = p.spinner();
  s.start("Installing dependencies…");
  await run(packageManager, [addArg, ...allDeps], { cwd: projectPath });
  s.stop("Dependencies installed");

  // Install dev deps
  if (allDevDeps.length > 0) {
    const devFlag = packageManager === "pnpm" ? "-D" : "--save-dev";
    s.start("Installing dev dependencies…");
    await run(packageManager, [addArg, devFlag, ...allDevDeps], {
      cwd: projectPath,
    });
    s.stop("Dev dependencies installed");
  }

  // Assemble .env.example
  const envVars = getEnvVars(framework, integrationOpts);
  if (envVars.length > 0) {
    const envExamplePath = join(projectPath, ".env.example");
    let envContent = readFileSync(envExamplePath, "utf-8");
    envContent += `\n${envVars.join("\n")}\n`;
    writeFileSync(envExamplePath, envContent);

    // Also create .env.local with same content for dev convenience
    writeFileSync(join(projectPath, ".env.local"), `${envVars.join("\n")}\n`);
  }
}
