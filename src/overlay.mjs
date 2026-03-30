import {
  cpSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { templatesDir } from "./utils.mjs";

/**
 * Copy template directories into the project, then strip conditional sections.
 */
export function applyOverlay(projectPath, options) {
  const tpl = templatesDir();
  const { framework, template, shadcn, rnr, supabase, posthog, sentry } =
    options;

  // 1. Copy shared templates
  copyDir(join(tpl, "shared"), projectPath);

  // 2. Copy framework base
  copyDir(join(tpl, framework, "base"), projectPath);

  // 2a. Copy template-specific files (overwrites base files as needed)
  if (template && template !== "bare") {
    copyDir(join(tpl, framework, template), projectPath);
  }

  // 2b. Expo-specific: remove default scaffold files that our templates replace
  if (framework === "expo") {
    const expoCleanup = [
      // Default scaffold screens
      "app/(tabs)/explore.tsx",
      "app/(tabs)/two.tsx",
      "app/+not-found.tsx",
      "app/+html.tsx",
      "app/modal.tsx",
      // Default scaffold components (PascalCase — older create-expo-app)
      "components/Collapsible.tsx",
      "components/EditScreenInfo.tsx",
      "components/ExternalLink.tsx",
      "components/HelloWave.tsx",
      "components/ParallaxScrollView.tsx",
      "components/StyledText.tsx",
      "components/ThemedText.tsx",
      "components/ThemedView.tsx",
      "components/Themed.tsx",
      // Default scaffold components (kebab-case — newer create-expo-app)
      "components/external-link.tsx",
      "components/hello-wave.tsx",
      "components/parallax-scroll-view.tsx",
      "components/themed-text.tsx",
      "components/themed-view.tsx",
      // Default scaffold hooks/utilities that may appear in components/
      "components/useClientOnlyValue.ts",
      "components/useColorScheme.ts",
      "components/useColorScheme.web.ts",
      // Default scaffold directories
      "components/__tests__",
      "components/navigation",
      "components/ui",
      "constants",
      "hooks",
      "scripts",
      // Web-only files (iOS simulator only)
      "hooks/useClientOnlyValue.ts",
      "hooks/useClientOnlyValue.web.ts",
      "eslint.config.js",
      "assets/images/partial-react-logo.png",
      "assets/images/react-logo.png",
      "assets/images/react-logo@2x.png",
      "assets/images/react-logo@3x.png",
    ];
    for (const rel of expoCleanup) {
      rmSync(join(projectPath, rel), { recursive: true, force: true });
    }

    // Remove all web-only files (*.web.ts, *.web.tsx, etc.) — iOS simulator only
    for (const file of walkFiles(projectPath)) {
      if (/\.web\.[jt]sx?$/.test(file)) {
        rmSync(file, { force: true });
      }
    }
  }

  // 2c. Rename _biome.json → biome.json (prefixed to avoid Biome config discovery in this repo)
  renameSync(join(projectPath, "_biome.json"), join(projectPath, "biome.json"));

  // 2c. Expo-specific: replace app.json with app.config.values.js and inject project name
  if (framework === "expo") {
    const appJson = join(projectPath, "app.json");
    rmSync(appJson, { force: true });

    const valuesPath = join(projectPath, "app.config.values.js");
    const projectName = projectPath.split("/").pop();
    const safeName = projectName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const bundleId = `com.anonymous.${safeName}`;
    let values = readFileSync(valuesPath, "utf-8");
    values = values.replaceAll("my-app", projectName);
    values = values.replaceAll("com.anonymous.myapp", bundleId);
    writeFileSync(valuesPath, values);
  }

  // 3. Copy integration overlays
  if (shadcn) copyDir(join(tpl, framework, "shadcn"), projectPath);
  if (rnr) copyDir(join(tpl, framework, "rnr"), projectPath);
  if (supabase) copyDir(join(tpl, framework, "supabase"), projectPath);
  if (posthog) copyDir(join(tpl, framework, "posthog"), projectPath);
  if (sentry) copyDir(join(tpl, framework, "sentry"), projectPath);

  // 4. Strip conditional sections from all .ts/.tsx files
  const integrations = { shadcn, rnr, supabase, posthog, sentry };
  stripConditionals(projectPath, integrations);
}

/**
 * Recursively copy a directory, overwriting existing files.
 */
function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true, force: true });
}

/**
 * Build regex patterns for a given tag name.
 * Returns { removeSection, removeMarkers } where:
 *   removeSection — removes the entire block including content
 *   removeMarkers — removes only the marker lines, keeping content
 */
function buildTagPatterns(tag) {
  return {
    removeSection: [
      new RegExp(
        `^[\\t ]*\\/\\/\\s*--\\s*${tag}_START\\s*--.*?^[\\t ]*\\/\\/\\s*--\\s*${tag}_END\\s*--[\\t ]*\\n?`,
        "gms",
      ),
      new RegExp(
        `^[\\t ]*\\{?\\/\\*\\s*--\\s*${tag}_START\\s*--\\s*\\*\\/\\}?.*?^[\\t ]*\\{?\\/\\*\\s*--\\s*${tag}_END\\s*--\\s*\\*\\/\\}?[\\t ]*\\n?`,
        "gms",
      ),
    ],
    removeMarkers: [
      new RegExp(`^[\\t ]*\\/\\/\\s*--\\s*${tag}_START\\s*--[\\t ]*\\n?`, "gm"),
      new RegExp(`^[\\t ]*\\/\\/\\s*--\\s*${tag}_END\\s*--[\\t ]*\\n?`, "gm"),
      new RegExp(
        `^[\\t ]*\\{?\\/\\*\\s*--\\s*${tag}_START\\s*--\\s*\\*\\/\\}?[\\t ]*\\n?`,
        "gm",
      ),
      new RegExp(
        `^[\\t ]*\\{?\\/\\*\\s*--\\s*${tag}_END\\s*--\\s*\\*\\/\\}?[\\t ]*\\n?`,
        "gm",
      ),
    ],
  };
}

/**
 * Walk all .ts/.tsx/.css files and strip marker-comment sections
 * for integrations that are NOT selected.
 */
function stripConditionals(dir, integrations) {
  const files = walkFiles(dir);
  const extensions = [".ts", ".tsx", ".css", ".json", ".js", ".md"];

  // Precompile all regex patterns once
  const compiled = Object.entries(integrations).map(([key, enabled]) => {
    const tag = key.toUpperCase();
    return {
      enabled,
      tag: buildTagPatterns(tag),
      noTag: buildTagPatterns(`NO_${tag}`),
    };
  });

  for (const file of files) {
    if (!extensions.some((ext) => file.endsWith(ext))) continue;

    let content = readFileSync(file, "utf-8");

    // Skip files with no marker comments
    if (!content.includes("_START")) continue;

    let changed = false;

    for (const { enabled, tag, noTag } of compiled) {
      // TAG sections: remove content when disabled, remove markers when enabled
      const tagPatterns = enabled ? tag.removeMarkers : tag.removeSection;
      for (const re of tagPatterns) {
        const before = content;
        content = content.replace(re, "");
        if (content !== before) changed = true;
      }

      // NO_TAG sections: remove content when enabled, remove markers when disabled
      const noTagPatterns = enabled ? noTag.removeSection : noTag.removeMarkers;
      for (const re of noTagPatterns) {
        const before = content;
        content = content.replace(re, "");
        if (content !== before) changed = true;
      }
    }

    if (changed) {
      // Collapse runs of 3+ blank lines down to a single blank line
      content = content.replace(/\n{3,}/g, "\n\n");
      writeFileSync(file, content);
    }
  }
}

const SKIP_DIRS = new Set(["node_modules", ".next", ".expo", ".git"]);

/**
 * Recursively list all files in a directory, skipping ignored dirs.
 */
function walkFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}
