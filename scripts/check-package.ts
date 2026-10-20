import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export function checkPackage() {
  const result = spawnSync(
    "npm",
    ["pack", "--dry-run", "--json", "--ignore-scripts"],
    {
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const [archive] = z
    .tuple([z.object({ files: z.array(z.object({ path: z.string() })) })])
    .parse(JSON.parse(result.stdout));
  const included = new Set(archive.files.map((file) => file.path));
  const missing = readdirSync("dist", { recursive: true, encoding: "utf8" })
    .filter((file) => statSync(join("dist", file)).isFile())
    .map((file) => `dist/${file.replaceAll("\\", "/")}`)
    .filter((file) => !included.has(file));
  if (missing.length)
    throw new Error(`npm would omit built files:\n${missing.join("\n")}`);
}
