import * as p from "@clack/prompts";
import type { Framework, IntegrationOptions, Skill } from "./types.ts";
import { run } from "./utils.ts";

/**
 * Recommended skills per framework.
 * Each entry maps to a `npx skills add <source> --skill <skill> -y` invocation.
 * If `skill` is omitted, all skills from the source are installed.
 */
export const NEXTJS_SKILLS: Skill[] = [
  {
    label: "Vercel React Best Practices",
    source: "https://github.com/vercel-labs/agent-skills",
    skill: "vercel-react-best-practices",
  },
  {
    label: "Next.js Best Practices",
    source: "vercel-labs/next-skills",
    skill: "next-best-practices",
  },
  {
    label: "Skill Creator",
    source: "anthropics/skills",
    skill: "skill-creator",
  },
];

export const EXPO_SKILLS: Skill[] = [
  {
    label: "Vercel React Native Skills",
    source: "https://github.com/vercel-labs/agent-skills",
    skill: "vercel-react-native-skills",
  },
  {
    label: "Expo Dev Client",
    source: "https://github.com/expo/skills",
    skill: "expo-dev-client",
  },
];

/** Skills conditional on selected integrations. */
export const INTEGRATION_SKILLS = {
  supabase: {
    label: "Supabase Agent Skills",
    source: "supabase/agent-skills",
  },
};

export function getSkillsForFramework(
  framework: Framework,
  options: IntegrationOptions = {},
): Skill[] {
  const base = framework === "expo" ? EXPO_SKILLS : NEXTJS_SKILLS;
  const extra = [];
  if (options.supabase) extra.push(INTEGRATION_SKILLS.supabase);
  return [...base, ...extra];
}

/**
 * Prompt the user to pick which skills to install. Call before scaffold.
 * Returns the selected skills, or null if skipped.
 */
export async function selectSkills(
  framework: Framework,
  options: IntegrationOptions = {},
) {
  const skills = getSkillsForFramework(framework, options);
  const selected = await p.multiselect({
    message:
      "Which developer skills would you like to install? (space to toggle, enter to confirm)",
    options: skills.map((s) => ({
      value: s,
      label: s.label,
      hint: s.skill ? `${s.source} → ${s.skill}` : s.source,
    })),
    initialValues: skills,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.log.info("Skipping skills installation");
    return null;
  }

  return selected;
}

/**
 * Install previously selected skills.
 */
export async function installSkills(projectPath: string, selected: Skill[]) {
  const s = p.spinner();
  s.start("Installing developer skills…");

  const failed = [];
  for (const entry of selected) {
    try {
      const args = ["skills", "add", entry.source];
      if (entry.skill) args.push("--skill", entry.skill);
      args.push("-y");
      await run("npx", args, { cwd: projectPath });
    } catch (err) {
      failed.push({ label: entry.label, error: String(err) });
    }
  }

  if (failed.length === 0) {
    s.stop(`${selected.length} developer skill(s) installed`);
  } else {
    s.stop(
      `Skills installed (${failed.map((f) => f.label).join(", ")} failed)`,
    );
    for (const f of failed) {
      p.log.warn(`${f.label}: ${f.error}`);
    }
  }
}
