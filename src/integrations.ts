import type { Framework, IntegrationOptions } from "./types.ts";

type DependencyCatalog = Partial<
  Record<keyof IntegrationOptions, { deps: string[]; devDeps: string[] }>
>;

/**
 * Return dependency lists for each integration, by framework.
 */

const nextjsDeps: DependencyCatalog = {
  shadcn: {
    deps: ["class-variance-authority"],
    devDeps: ["@radix-ui/react-slot"],
  },
  supabase: {
    deps: ["@supabase/supabase-js", "@supabase/ssr"],
    devDeps: ["supabase"],
  },
  posthog: {
    deps: ["posthog-js"],
    devDeps: [],
  },
  sentry: {
    deps: ["@sentry/nextjs"],
    devDeps: [],
  },
};

const expoDeps: DependencyCatalog = {
  rnr: {
    deps: ["class-variance-authority", "clsx", "tailwind-merge"],
    devDeps: ["@rn-primitives/slot"],
  },
  supabase: {
    deps: [
      "@supabase/supabase-js",
      "@react-native-async-storage/async-storage",
    ],
    devDeps: ["supabase"],
  },
  posthog: {
    deps: ["posthog-react-native"],
    devDeps: [],
  },
  sentry: {
    deps: ["@sentry/react-native"],
    devDeps: [],
  },
};

/**
 * Get all deps to install based on selected integrations.
 */
export function getIntegrationDeps(
  framework: Framework,
  options: IntegrationOptions,
) {
  const catalog = framework === "nextjs" ? nextjsDeps : expoDeps;
  const deps = [];
  const devDeps = [];

  for (const key of [
    "shadcn",
    "rnr",
    "supabase",
    "posthog",
    "sentry",
  ] as const) {
    const entry = catalog[key];
    if (options[key] && entry) {
      deps.push(...entry.deps);
      devDeps.push(...entry.devDeps);
    }
  }

  return { deps, devDeps };
}

/**
 * Get env vars for .env.local based on framework and integrations.
 */
export function getEnvVars(framework: Framework, options: IntegrationOptions) {
  const vars = [];
  const prefix = framework === "nextjs" ? "NEXT_PUBLIC_" : "EXPO_PUBLIC_";

  if (options.supabase) {
    vars.push(`${prefix}SUPABASE_URL=`);
    vars.push(`${prefix}SUPABASE_ANON_KEY=`);
  }

  if (options.posthog) {
    vars.push(`${prefix}POSTHOG_KEY=`);
    vars.push(`${prefix}POSTHOG_HOST=https://us.i.posthog.com`);
  }

  if (options.sentry) {
    vars.push(`${prefix}SENTRY_DSN=`);
    if (framework === "nextjs") {
      vars.push("SENTRY_AUTH_TOKEN=");
    }
  }

  return vars;
}
