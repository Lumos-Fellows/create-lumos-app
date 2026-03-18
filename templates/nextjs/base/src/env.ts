import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // -- SUPABASE_START --
    // Server-only Supabase vars can go here if needed
    // -- SUPABASE_END --
    // -- SENTRY_START --
    SENTRY_AUTH_TOKEN: z.string().optional(),
    // -- SENTRY_END --
  },
  client: {
    // -- SUPABASE_START --
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // -- SUPABASE_END --
    // -- POSTHOG_START --
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    // -- POSTHOG_END --
    // -- SENTRY_START --
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    // -- SENTRY_END --
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    // -- SUPABASE_START --
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // -- SUPABASE_END --
    // -- POSTHOG_START --
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    // -- POSTHOG_END --
    // -- SENTRY_START --
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // -- SENTRY_END --
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
