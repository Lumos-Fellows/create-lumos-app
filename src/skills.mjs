import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

/**
 * Recommended skills that are selected by default.
 * Each entry maps to a `npx skills add <source> --skill <skill> -y` invocation.
 */
export const DEFAULT_SKILLS = [
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

/**
 * Prompt the user to pick which recommended skills to install, then install them.
 */
export async function installSkills(projectPath) {
  const selected = await p.multiselect({
    message: "Which developer skills would you like to install?",
    options: DEFAULT_SKILLS.map((s) => ({
      value: s,
      label: s.label,
      hint: `${s.source} → ${s.skill}`,
    })),
    initialValues: [...DEFAULT_SKILLS],
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.log.info("Skipping skills installation");
    return;
  }

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
    } catch {
      failed.push(entry.label);
    }
  }

  if (failed.length === 0) {
    s.stop(`${selected.length} developer skill(s) installed`);
  } else {
    s.stop(`Skills installed (${failed.join(", ")} failed)`);
  }
}
