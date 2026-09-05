import { z } from "zod";

export const projectName = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{0,63}$/,
    "Use 1–64 lowercase letters, numbers, or hyphens.",
  );
export const projectInput = z.object({
  name: projectName,
  framework: z.enum(["nextjs", "expo"]),
  template: z.enum(["bare", "notes-app"]),
  packageManager: z.enum(["pnpm", "npm"]),
  components: z.boolean(),
  supabase: z.boolean(),
  posthog: z.boolean(),
  sentry: z.boolean(),
});
export const jobSchema = z.object({
  name: z.string(),
  status: z.enum(["running", "ready", "failed"]),
  log: z.string(),
});
export type Job = z.infer<typeof jobSchema>;
export const stateSchema = z.object({
  projects: z.array(z.string()),
  job: jobSchema.nullable(),
});
export const entriesSchema = z.array(
  z.object({ name: z.string(), directory: z.boolean() }),
);
export const errorSchema = z.object({ error: z.string() });

export type ApiResponse =
  | Job
  | z.infer<typeof stateSchema>
  | z.infer<typeof entriesSchema>
  | z.infer<typeof errorSchema>;
