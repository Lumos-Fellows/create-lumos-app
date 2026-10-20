import { z } from "zod";

export const claudeSettingsSchema = z.object({
  hooks: z.object({
    Stop: z.array(
      z.object({ hooks: z.array(z.object({ command: z.string() })) }),
    ),
  }),
});
