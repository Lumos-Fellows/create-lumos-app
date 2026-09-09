import type { SpawnOptions } from "node:child_process";

export type Framework = "nextjs" | "expo";
export type PackageManager = "pnpm" | "npm";
export type Template = "bare" | "notes-app";

export interface IntegrationOptions {
  shadcn?: boolean;
  rnr?: boolean;
  supabase?: boolean;
  posthog?: boolean;
  sentry?: boolean;
}

export interface ProjectOptions extends IntegrationOptions {
  name: string;
  resolvedName?: string;
  framework: Framework;
  template: Template;
  packageManager: PackageManager;
  skills: boolean;
}

export type OverlayOptions = IntegrationOptions & {
  framework: Framework;
  template?: Template;
};
export type PackageOptions = IntegrationOptions &
  Pick<ProjectOptions, "framework" | "packageManager" | "resolvedName">;
export type ScaffoldOptions = Pick<
  ProjectOptions,
  "name" | "framework" | "packageManager" | "resolvedName"
>;
export type CommandRunner = (
  command: string,
  args?: string[],
  options?: SpawnOptions,
) => Promise<string>;
export type GitRunner = (
  command: string,
  args: string[],
  options: { cwd: string },
) => string | Promise<string>;

export interface Skill {
  label: string;
  source: string;
  skill?: string;
}
