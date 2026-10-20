import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join } from "node:path";
import { z } from "zod";
import { sourceFiles, validateSourceFiles } from "./typecheck-policy.js";

const configSchema = z.object({
  compilerOptions: z.object({
    strict: z.boolean().optional(),
    noCheck: z.boolean().optional(),
    allowJs: z.boolean().optional(),
    checkJs: z.boolean().optional(),
    noImplicitAny: z.boolean().optional(),
    noImplicitThis: z.boolean().optional(),
    strictNullChecks: z.boolean().optional(),
    strictFunctionTypes: z.boolean().optional(),
    strictBindCallApply: z.boolean().optional(),
    strictPropertyInitialization: z.boolean().optional(),
    strictBuiltinIteratorReturn: z.boolean().optional(),
    alwaysStrict: z.boolean().optional(),
    useUnknownInCatchVariables: z.boolean().optional(),
  }),
});
const strictOptions = [
  "noImplicitAny",
  "noImplicitThis",
  "strictNullChecks",
  "strictFunctionTypes",
  "strictBindCallApply",
  "strictPropertyInitialization",
  "strictBuiltinIteratorReturn",
  "alwaysStrict",
  "useUnknownInCatchVariables",
] as const;
const root = realpathSync(process.cwd());
const repository = process.argv.includes("--repo");
const projects = repository
  ? ["tsconfig.json"]
  : ["tsconfig.json", "tsconfig.tooling.json"];
const require = createRequire(join(root, "package.json"));
const compilerPackage = require.resolve("typescript/package.json");
const manifest = z
  .object({ bin: z.object({ tsc: z.string() }) })
  .parse(JSON.parse(readFileSync(compilerPackage, "utf8")));
const compiler = join(dirname(compilerPackage), manifest.bin.tsc);

function runCompiler(args: string[]) {
  const result = spawnSync(process.execPath, [compiler, ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    // Suppress only the successful file listing, preserving compiler diagnostics.
    console.error(
      (result.stdout + result.stderr)
        .split(/\r?\n/u)
        .filter((line) => !existsSync(line))
        .join("\n"),
    );
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

const checked = new Set<string>();
const checkedJavaScript = new Set<string>();
for (const project of projects) {
  const { compilerOptions } = configSchema.parse(
    JSON.parse(runCompiler(["--showConfig", "-p", project])),
  );
  const disabled = strictOptions.filter(
    (name) => compilerOptions[name] === false,
  );
  if (
    compilerOptions.strict !== true ||
    compilerOptions.noCheck ||
    disabled.length
  ) {
    console.error(
      `${project}: keep strict typechecking enabled${disabled.length ? ` (${disabled.join(", ")})` : ""}.`,
    );
    process.exit(1);
  }
  const listing = runCompiler([
    "--noEmit",
    "--listFiles",
    "--pretty",
    "false",
    "-p",
    project,
  ]);
  for (const file of listing.split(/\r?\n/u)) {
    if (!isAbsolute(file) || !existsSync(file)) continue;
    const canonical = realpathSync(file);
    checked.add(canonical);
    if (compilerOptions.allowJs && compilerOptions.checkJs)
      checkedJavaScript.add(canonical);
  }
}
const errors = validateSourceFiles(
  root,
  sourceFiles(root, repository),
  checked,
  checkedJavaScript,
  repository,
);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
