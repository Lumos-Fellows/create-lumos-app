import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { getEnvVars, getIntegrationDeps } from "./integrations.ts";
import type {
  CommandRunner,
  Framework,
  PackageManager,
  PackageOptions,
} from "./types.ts";
import { exec, readJson, run, writeJson } from "./utils.ts";

export const BIOME_VERSION = "2.4.8";
export const OXLINT_VERSION = "1.81.0";
export const TSX_VERSION = "4.23.12";
interface BuildApprovals {
  [packageName: string]: boolean;
}
const PNPM_BUILD_CONFIG_SECTIONS = new Set([
  "allowBuilds",
  "onlyBuiltDependencies",
  "neverBuiltDependencies",
  "ignoredBuiltDependencies",
]);

export function packageManagerSpec(
  packageManager: PackageManager,
  version: string | number | null | undefined,
) {
  const normalizedVersion = String(version ?? "")
    .trim()
    .split(/\s+/)[0];

  return normalizedVersion ? `${packageManager}@${normalizedVersion}` : null;
}

export function detectPackageManagerVersion(packageManager: PackageManager) {
  try {
    return exec(`${packageManager} --version`);
  } catch {
    return null;
  }
}

function parsePnpmBuildSection(
  section: string,
  line: string,
  allowBuilds: BuildApprovals,
) {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (section === "allowBuilds") {
    const entry = trimmed.match(/^([^:#][^:]*):\s*(.*)$/);
    if (entry) {
      allowBuilds[entry[1].trim()] = entry[2].trim() === "true";
    }
    return;
  }

  const listItem = trimmed.match(/^-\s+(.+)$/);
  if (!listItem) return;

  allowBuilds[listItem[1].trim()] = section === "onlyBuiltDependencies";
}

export function pnpmWorkspaceWithAllowBuilds(
  existingContent: string | undefined,
  buildApprovals: BuildApprovals,
) {
  const allowBuilds: BuildApprovals = {};
  const retainedLines: string[] = [];
  const lines = existingContent ? existingContent.split(/\r?\n/) : [];

  for (let i = 0; i < lines.length; ) {
    const section = lines[i].match(/^([A-Za-z][A-Za-z0-9-]*):\s*$/)?.[1];

    if (!section || !PNPM_BUILD_CONFIG_SECTIONS.has(section)) {
      retainedLines.push(lines[i]);
      i += 1;
      continue;
    }

    i += 1;
    while (
      i < lines.length &&
      (lines[i].trim() === "" || /^\s/.test(lines[i]))
    ) {
      parsePnpmBuildSection(section, lines[i], allowBuilds);
      i += 1;
    }
  }

  for (const [name, approved] of Object.entries(buildApprovals)) {
    allowBuilds[name] = approved;
  }

  while (retainedLines.at(-1) === "") retainedLines.pop();

  const buildEntries = Object.entries(allowBuilds).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  if (buildEntries.length > 0) {
    if (retainedLines.length > 0) retainedLines.push("");
    retainedLines.push(
      "allowBuilds:",
      ...buildEntries.map(([name, approved]) => `  ${name}: ${approved}`),
    );
  }

  return retainedLines.length > 0 ? `${retainedLines.join("\n")}\n` : "";
}

export function writePnpmWorkspaceAllowBuilds(
  projectPath: string,
  buildApprovals: BuildApprovals,
) {
  const workspacePath = join(projectPath, "pnpm-workspace.yaml");
  const existingContent = existsSync(workspacePath)
    ? readFileSync(workspacePath, "utf-8")
    : "";
  const nextContent = pnpmWorkspaceWithAllowBuilds(
    existingContent,
    buildApprovals,
  );

  if (nextContent) {
    writeFileSync(workspacePath, nextContent);
  }
}

export function getBasePackageDeps(framework: Framework) {
  if (framework === "nextjs") {
    return {
      deps: [
        "clsx",
        "tailwind-merge",
        "@t3-oss/env-nextjs",
        "zod",
        "next-themes",
      ],
      devDeps: [
        `@biomejs/biome@${BIOME_VERSION}`,
        `oxlint@${OXLINT_VERSION}`,
        `@oxlint/plugins@${OXLINT_VERSION}`,
        `tsx@${TSX_VERSION}`,
        "@types/node@22",
      ],
    };
  }

  return {
    deps: [
      "zod",
      "@expo/vector-icons",
      "expo-dev-client",
      "expo-haptics",
      "expo-system-ui",
      // NativeWind's Babel transform injects this import into app source.
      // Keep it direct so strict package managers such as pnpm expose it.
      "react-native-css-interop",
    ],
    devDeps: [
      `@biomejs/biome@${BIOME_VERSION}`,
      `oxlint@${OXLINT_VERSION}`,
      `@oxlint/plugins@${OXLINT_VERSION}`,
      `tsx@${TSX_VERSION}`,
      "@types/node@22",
      "nativewind",
      "tailwindcss@3",
      "tailwindcss-animate",
      "@types/babel__core",
    ],
  };
}

/**
 * Modify package.json, assemble .env.local, and install dependencies.
 */
export async function setupPackages(
  projectPath: string,
  options: PackageOptions,
  {
    runner = run,
    versionResolver = detectPackageManagerVersion,
  }: {
    runner?: CommandRunner;
    versionResolver?: (manager: PackageManager) => string | null;
  } = {},
) {
  const { framework, packageManager, shadcn, rnr, supabase, posthog, sentry } =
    options;
  const pkgPath = join(projectPath, "package.json");
  const pkg = readJson(pkgPath);

  // Use the pre-resolved name (handles "." in uppercase directories).
  pkg.name = options.resolvedName;
  const selectedPackageManager = packageManagerSpec(
    packageManager,
    versionResolver(packageManager),
  );
  if (selectedPackageManager) {
    pkg.packageManager = selectedPackageManager;
  }

  // Add scripts
  pkg.scripts = {
    ...pkg.scripts,
    format: "biome format --write .",
    lint: "biome check --error-on-warnings . && oxlint .",
    typecheck: "tsc --noEmit && tsc --noEmit -p tsconfig.tooling.json",
    verify: "tsx tools/verify.ts",
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
      'if [ ! -d "android" ]; then echo "\\n  No android/ directory found. Run \\"pnpm prebuild\\" first to generate native projects.\\n" && exit 1; fi && expo run:android';
    pkg.scripts.ios =
      'if [ ! -d "ios" ]; then echo "\\n  No ios/ directory found. Run \\"pnpm prebuild\\" first to generate native projects.\\n" && exit 1; fi && expo run:ios';
    pkg.scripts["build:production"] =
      "eas build --output dist/ios-production.ipa --profile production --platform ios --local";
    pkg.scripts.submit =
      "eas submit --platform ios --path dist/ios-production.ipa";
    pkg.scripts["push:production"] =
      "pnpm prebuild && pnpm build:production --non-interactive && pnpm submit --non-interactive";
  }

  if (pkg.pnpm?.onlyBuiltDependencies) {
    delete pkg.pnpm.onlyBuiltDependencies;
    if (Object.keys(pkg.pnpm).length === 0) {
      delete pkg.pnpm;
    }
  }

  writeJson(pkgPath, pkg);

  if (packageManager === "pnpm") {
    writePnpmWorkspaceAllowBuilds(
      projectPath,
      supabase ? { supabase: true } : {},
    );
  }

  // Collect all deps to install
  const { deps: baseDeps, devDeps: baseDevDeps } =
    getBasePackageDeps(framework);

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
  await runner(packageManager, [addArg, ...allDeps], { cwd: projectPath });
  s.stop("Dependencies installed");

  // Install dev deps
  if (allDevDeps.length > 0) {
    const devFlag = packageManager === "pnpm" ? "-D" : "--save-dev";
    s.start("Installing dev dependencies…");
    await runner(
      packageManager,
      [addArg, devFlag, "--save-exact", ...allDevDeps],
      {
        cwd: projectPath,
      },
    );
    s.stop("Dev dependencies installed");
  }

  // Ensure .env.local exists, then append integration env vars when needed.
  // Some scaffolders no longer create this file by default.
  const envLocalPath = join(projectPath, ".env.local");
  let envContent = existsSync(envLocalPath)
    ? readFileSync(envLocalPath, "utf-8")
    : "";

  const envVars = getEnvVars(framework, integrationOpts);
  if (envVars.length > 0) {
    envContent += `\n${envVars.join("\n")}\n`;
  }
  writeFileSync(envLocalPath, envContent);
}
