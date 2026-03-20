import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Recommended skills per framework.
 * Each entry maps to a `npx skills add <source> --skill <skill> -y` invocation.
 */
export const NEXTJS_SKILLS = [
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

export const EXPO_SKILLS = [
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

/** @param {"nextjs" | "expo"} framework */
export function getSkillsForFramework(framework) {
  return framework === "expo" ? EXPO_SKILLS : NEXTJS_SKILLS;
}

/**
 * Prompt the user to pick which skills to install. Call before scaffold.
 * @returns {import("./skills.mjs").Skill[] | null} selected skills, or null if skipped
 */
export async function selectSkills(framework) {
  const skills = getSkillsForFramework(framework);
  const selected = await p.multiselect({
    message:
      "Which developer skills would you like to install? (space to toggle, enter to confirm)",
    options: skills.map((s) => ({
      value: s,
      label: s.label,
      hint: `${s.source} → ${s.skill}`,
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
export async function installSkills(projectPath, selected) {
  const s = p.spinner();
  s.start("Installing developer skills…");

  const failed = [];
  for (const entry of selected) {
    try {
      await run(
        "npx",
        ["skills", "add", entry.source, "--skill", entry.skill, "-y"],
        {
          cwd: projectPath,
        },
      );
    } catch (err) {
      failed.push({ label: entry.label, error: err.message });
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
