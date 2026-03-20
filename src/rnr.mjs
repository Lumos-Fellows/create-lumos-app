import * as p from "@clack/prompts";
import { run } from "./utils.mjs";

const RNR_COMPONENTS = [
  "button",
  "card",
  "input",
  "label",
  "badge",
  "separator",
  "skeleton",
  "text",
];

export async function installRnr(projectPath) {
  const s = p.spinner();
  s.start("Installing React Native Reusables components…");
  try {
    await run(
      "npx",
      ["@react-native-reusables/cli@latest", "add", ...RNR_COMPONENTS, "--yes"],
      { cwd: projectPath },
    );
    s.stop("React Native Reusables components installed");
  } catch (err) {
    s.stop(
      "RNR install failed — run `npx @react-native-reusables/cli add` manually",
    );
    p.log.warn(err.message);
  }
}
