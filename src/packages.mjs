import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getEnvVars, getIntegrationDeps } from "./integrations.mjs";
import { readJson, run, writeJson } from "./utils.mjs";

/**
 * Modify package.json, assemble .env.local, and install dependencies.
 */
export async function setupPackages(projectPath, options) {
  const { framework, packageManager, shadcn, supabase, posthog, sentry } =
    options;
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
      ? ["clsx", "tailwind-merge", "@t3-oss/env-nextjs", "zod"]
      : ["clsx", "tailwind-merge", "zod"];

  const baseDevDeps = ["@biomejs/biome"];

  const integrationOpts = { shadcn, supabase, posthog, sentry };
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

  // Append integration env vars to .env.local
  const envVars = getEnvVars(framework, integrationOpts);
  if (envVars.length > 0) {
    const envLocalPath = join(projectPath, ".env.local");
    let envContent = readFileSync(envLocalPath, "utf-8");
    envContent += `\n${envVars.join("\n")}\n`;
    writeFileSync(envLocalPath, envContent);
  }
}
