import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { assertAgentGuidance } from "./helpers/agent-guidance.ts";

it("the repo shares its canonical instructions with Claude and indexes every rule", () => {
  assertAgentGuidance(fileURLToPath(new URL("..", import.meta.url)));
});
