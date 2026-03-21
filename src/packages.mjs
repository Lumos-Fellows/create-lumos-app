import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getEnvVars, getIntegrationDeps } from "./integrations.mjs";
import { readJson, run, writeJson } from "./utils.mjs";

/**
 * Modify package.json, assemble .env.local, and install dependencies.
 */
export async function setupPackages(projectPath, options) {
  const { framework, packageManager, shadcn, rnr, supabase, posthog, sentry } =
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

  // Add Expo-specific scripts
  if (framework === "expo") {
    pkg.scripts.start = "expo start --dev-client";
    pkg.scripts.prebuild = "EXPO_NO_GIT_STATUS=1 expo prebuild --clean";
    pkg.scripts.android =
      'if [ ! -d "android" ]; then echo "\\n  No android/ directory found. Run \\\"pnpm prebuild\\\" first to generate native projects.\\n" && exit 1; fi && expo run:android';
    pkg.scripts.ios =
      'if [ ! -d "ios" ]; then echo "\\n  No ios/ directory found. Run \\\"pnpm prebuild\\\" first to generate native projects.\\n" && exit 1; fi && expo run:ios';
    pkg.scripts["build:production"] =
      "eas build --output dist/ios-production.ipa --profile production --platform ios --local";
    pkg.scripts.submit =
      "eas submit --platform ios --path dist/ios-production.ipa";
    pkg.scripts["push:production"] =
      "pnpm prebuild && pnpm build:production --non-interactive && pnpm submit --non-interactive";
  }

  // Allow supabase postinstall script to download the platform binary
  if (supabase && packageManager === "pnpm") {
    pkg.pnpm = { ...pkg.pnpm, onlyBuiltDependencies: ["supabase"] };
  }

  writeJson(pkgPath, pkg);

  // Collect all deps to install
  const baseDeps =
    framework === "nextjs"
      ? ["clsx", "tailwind-merge", "@t3-oss/env-nextjs", "zod"]
      : ["zod", "expo-dev-client", "expo-haptics", "expo-system-ui"];

  const baseDevDeps =
    framework === "nextjs"
      ? ["@biomejs/biome"]
      : [
          "@biomejs/biome",
          "nativewind",
          "tailwindcss@3",
          "tailwindcss-animate",
        ];

  const integrationOpts = { shadcn, rnr, supabase, posthog, sentry };
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
