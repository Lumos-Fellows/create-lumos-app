import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { applyOverlay } from "../src/overlay.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const oxlint = join(
  dirname(require.resolve("oxlint/package.json")),
  "bin/oxlint",
);

const cases: { name: string; code: string; rule?: string; file?: string }[] = [
  {
    name: "eyebrow",
    code: "<><Eyebrow>New</Eyebrow><h1>Notes</h1></>",
    rule: "no-eyebrow-before-heading",
  },
  {
    name: "eyebrow with reason",
    code: "<>{/* EYEBROW_HEADING_OVERRIDE: Distinguishes two account categories. */}<Eyebrow>Personal</Eyebrow><h1>Notes</h1></>",
  },
  {
    name: "unrelated label",
    code: '<><p className="text-sm">Saved</p><h1>Notes</h1></>',
  },
  {
    name: "description",
    code: '<section><h1>Notes</h1><p className="text-sm text-muted-foreground">All your notes</p></section>',
    rule: "no-heading-description",
  },
  {
    name: "essential description",
    code: '<section>{/* HEADING-DESCRIPTION: Explains a destructive retention policy. */}<h1>Delete account</h1><p className="text-sm text-muted-foreground">Permanently removes saved notes.</p></section>',
  },
  {
    name: "runtime result",
    code: '<section><h1>Notes</h1><p className="text-sm text-muted-foreground">{count} saved</p></section>',
  },
  {
    name: "nested runtime result",
    code: '<><h1>Notes</h1><p className="text-sm text-muted-foreground"><strong>{count}</strong> saved</p></>',
  },
  {
    name: "fragment description",
    code: '<><h1>Notes</h1><p className="text-sm text-muted-foreground">All your notes</p></>',
    rule: "no-heading-description",
  },
  {
    name: "spinner replaces label",
    code: '<button>{pending ? <Spinner /> : "Save"}</button>',
    rule: "no-spinner-only-button",
  },
  {
    name: "nested spinner replaces label",
    code: '<Button><span>{pending ? <Spinner /> : "Save"}</span></Button>',
    rule: "no-spinner-only-button",
  },
  {
    name: "optional icon cannot replace label",
    code: '<button>{pending ? <Spinner /> : "Save"}{error && <WarningIcon />}</button>',
    rule: "no-spinner-only-button",
  },
  {
    name: "persistent button label",
    code: '<button>Save {pending ? <Spinner /> : ""}</button>',
  },
  {
    name: "persistent nested label",
    code: '<button><span>Save</span>{pending ? <Spinner /> : "Save"}</button>',
  },
  {
    name: "conditional spinner with label",
    code: "<Button>{pending && <Spinner />}Save</Button>",
  },
  {
    name: "placeholder",
    code: '<input placeholder="Search..." />',
    rule: "no-placeholder-ellipsis",
  },
  {
    name: "expression placeholder",
    code: '<input placeholder={"Search…"} />',
    rule: "no-placeholder-ellipsis",
  },
  {
    name: "direct placeholder",
    code: '<input placeholder="Search notes" title="Search..." />',
  },
  {
    name: "redirect",
    code: 'import { redirect as go } from "next/navigation"; export function page() { go("/notes"); }',
    rule: "require-redirect-purpose",
  },
  {
    name: "redirect purpose",
    code: 'import { redirect } from "next/navigation"; export function page() {\n // REDIRECT-PURPOSE: Open the notes list as the initial workspace.\n redirect("/notes"); }',
  },
  {
    name: "namespace redirect",
    code: 'import * as navigation from "next/navigation"; export function page() { navigation.redirect("/notes"); }',
    rule: "require-redirect-purpose",
  },
  {
    name: "response redirect",
    code: 'import { NextResponse as Response } from "next/server"; export function GET() { return Response.redirect("https://example.com"); }',
    rule: "require-redirect-purpose",
  },
  {
    name: "shadowed redirect",
    code: 'import { redirect } from "next/navigation"; export function page(redirect: (path: string) => string) { return redirect("/notes"); }',
  },
  {
    name: "route helper",
    file: "src/app/helper.tsx",
    code: 'export const title = "Notes";',
    rule: "no-route-adjacent-helpers",
  },
  {
    name: "route private component",
    file: "src/app/_components/title.tsx",
    code: "<h1>Notes</h1>",
  },
  {
    name: "route test",
    file: "src/app/page.test.tsx",
    code: 'export const title = "Notes";',
  },
];

for (const example of cases) {
  it(`app quality: ${example.name}`, () => {
    const project = mkdtempSync(join(root, ".quality-test-"));
    try {
      applyOverlay(project, { framework: "nextjs", template: "bare" });
      const file = example.file ?? "src/app/page.tsx";
      mkdirSync(dirname(join(project, file)), { recursive: true });
      const code = example.code.startsWith("<")
        ? `export default function Page() { return (${example.code}); }`
        : example.code;
      writeFileSync(join(project, file), code);
      const result = spawnSync(process.execPath, [oxlint, file], {
        cwd: project,
        encoding: "utf8",
      });
      assert.ifError(result.error);
      const output = result.stdout + result.stderr;
      assert.equal(result.status, example.rule ? 1 : 0, output);
      if (example.rule) assert.ok(output.includes(example.rule), output);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
}
