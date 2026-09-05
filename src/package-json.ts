import { z } from "zod";

export const packageJsonSchema = z
  .object({
    name: z.string().optional(),
    packageManager: z.string().optional(),
    scripts: z.record(z.string(), z.string()).default({}),
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    pnpm: z
      .object({ onlyBuiltDependencies: z.array(z.string()).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type PackageJson = z.infer<typeof packageJsonSchema>;
