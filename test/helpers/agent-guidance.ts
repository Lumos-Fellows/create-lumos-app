import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function assertAgentGuidance(projectPath: string, supabase?: boolean) {
  const instructions = readFileSync(join(projectPath, "AGENTS.md"), "utf-8");
  assert.equal(
    readFileSync(join(projectPath, "CLAUDE.md"), "utf-8").trim(),
    "@AGENTS.md",
  );
  assert.match(instructions, /Before starting work, read each rules file/);
  assert.match(instructions, /keep this index in sync/);
  assert.doesNotMatch(instructions, /\.claude\/rules|--\s+[A-Z_]+_(START|END)/);
  assert.equal(existsSync(join(projectPath, ".claude", "rules")), false);

  const links = [
    ...instructions.matchAll(/\]\((\.agents\/rules\/[^)]+\.md)\)/g),
  ].map((match) => match[1]);
  const rules = readdirSync(join(projectPath, ".agents", "rules"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `.agents/rules/${file}`);
  assert.ok(rules.length > 0);
  assert.deepEqual(
    links.sort(),
    rules.sort(),
    `${projectPath}: rule links must exist and cover every rule exactly once`,
  );
  if (supabase !== undefined) {
    assert.equal(rules.includes(".agents/rules/supabase.md"), supabase);
  }
}
