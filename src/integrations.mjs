/**
 * Return dependency lists for each integration, by framework.
 */

const nextjsDeps = {
  supabase: {
    deps: ["@supabase/supabase-js", "@supabase/ssr"],
    devDeps: [],
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

const expoDeps = {
  supabase: {
    deps: [
      "@supabase/supabase-js",
      "@react-native-async-storage/async-storage",
    ],
    devDeps: [],
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
export function getIntegrationDeps(framework, options) {
  const catalog = framework === "nextjs" ? nextjsDeps : expoDeps;
  const deps = [];
  const devDeps = [];

  for (const [key, selected] of Object.entries(options)) {
    if (selected && catalog[key]) {
      deps.push(...catalog[key].deps);
      devDeps.push(...catalog[key].devDeps);
    }
  }

  return { deps, devDeps };
}

/**
 * Get env vars for .env.local based on framework and integrations.
 */
export function getEnvVars(framework, options) {
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
