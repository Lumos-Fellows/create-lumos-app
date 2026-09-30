import { z } from "zod";

const envSchema = z.object({
  // -- SUPABASE_START --
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  // -- SUPABASE_END --
  // -- POSTHOG_START --
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  // -- POSTHOG_END --
  // -- SENTRY_START --
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  // -- SENTRY_END --
});

export const env = envSchema.parse({
  // -- SUPABASE_START --
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined,
  // -- SUPABASE_END --
  // -- POSTHOG_START --
  EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY || undefined,
  EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST || undefined,
  // -- POSTHOG_END --
  // -- SENTRY_START --
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
  // -- SENTRY_END --
});
