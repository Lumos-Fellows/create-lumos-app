import {
  cpSync,
  readdirSync,
  readFileSync,
  renameSync,
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
  const { framework, shadcn, supabase, posthog, sentry } = options;

  // 1. Copy shared templates
  copyDir(join(tpl, "shared"), projectPath);

  // 2. Copy framework base
  copyDir(join(tpl, framework, "base"), projectPath);

  // 2b. Rename _biome.json → biome.json (prefixed to avoid Biome config discovery in this repo)
  renameSync(join(projectPath, "_biome.json"), join(projectPath, "biome.json"));

  // 3. Copy integration overlays
  if (shadcn) copyDir(join(tpl, framework, "shadcn"), projectPath);
  if (supabase) copyDir(join(tpl, framework, "supabase"), projectPath);
  if (posthog) copyDir(join(tpl, framework, "posthog"), projectPath);
  if (sentry) copyDir(join(tpl, framework, "sentry"), projectPath);

  // 4. Strip conditional sections from all .ts/.tsx files
  const integrations = { shadcn, supabase, posthog, sentry };
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
  const extensions = [".ts", ".tsx", ".css", ".json"];

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

    if (changed) writeFileSync(file, content);
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
