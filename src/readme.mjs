import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Generate a README.md for the scaffolded project.
 */
export function generateReadme(projectPath, options) {
  const {
    name,
    framework,
    packageManager,
    shadcn,
    rnr,
    supabase,
    posthog,
    sentry,
  } = options;

  const pm = packageManager;
  const runCmd = pm === "pnpm" ? "pnpm" : "npm run";
  const isNext = framework === "nextjs";
  const devCmd = isNext ? `${runCmd} dev` : "npx expo start";

  const integrations = [];
  if (supabase) integrations.push("Supabase");
  if (posthog) integrations.push("PostHog");
  if (sentry) integrations.push("Sentry");

  const prefix = isNext ? "NEXT_PUBLIC_" : "EXPO_PUBLIC_";
  const envVarDocs = [];
  if (supabase) {
    envVarDocs.push(
      `| \`${prefix}SUPABASE_URL\` | Your Supabase project URL |`,
      `| \`${prefix}SUPABASE_ANON_KEY\` | Your Supabase anon/public key |`,
    );
  }
  if (posthog) {
    envVarDocs.push(
      `| \`${prefix}POSTHOG_KEY\` | PostHog project API key (optional) |`,
      `| \`${prefix}POSTHOG_HOST\` | PostHog instance URL (optional) |`,
    );
  }
  if (sentry) {
    envVarDocs.push(`| \`${prefix}SENTRY_DSN\` | Sentry DSN (optional) |`);
    if (isNext) {
      envVarDocs.push(
        `| \`SENTRY_AUTH_TOKEN\` | Sentry auth token for source maps (optional) |`,
      );
    }
  }

  const content = `# ${name}

Created with [create-lumos-app](https://github.com/lumos-fellows/create-lumos-app).

## Stack

- **Framework**: ${isNext ? "Next.js (App Router)" : "Expo (React Native)"}
- **Language**: TypeScript
- **Styling**: ${isNext ? (shadcn ? "Tailwind CSS v4 + shadcn/ui" : "Tailwind CSS v4") : rnr ? "NativeWind (Tailwind CSS) + React Native Reusables" : "NativeWind (Tailwind CSS)"}
- **Linter/Formatter**: Biome
${integrations.length > 0 ? `- **Integrations**: ${integrations.join(", ")}` : ""}

## Getting Started

\`\`\`bash
# Install dependencies
${pm} install

# Fill in your env vars
$EDITOR .env.local

# Start the dev server
${devCmd}
\`\`\`
${
  envVarDocs.length > 0
    ? `
## Environment Variables

| Variable | Description |
|----------|-------------|
${envVarDocs.join("\n")}

Fill in your values in \`.env.local\`.
`
    : ""
}
## Scripts

| Command | Description |
|---------|-------------|
${
  isNext
    ? `| \`${runCmd} dev\` | Start development server |
| \`${runCmd} build\` | Build for production |`
    : `| \`${runCmd} start\` | Start Expo dev server |
| \`${runCmd} android\` | Run on Android |
| \`${runCmd} ios\` | Run on iOS |
| \`${runCmd} prebuild\` | Generate native projects |`
}
| \`${runCmd} format\` | Format code with Biome |
| \`${runCmd} lint\` | Lint code with Biome |
| \`${runCmd} typecheck\` | Run TypeScript type checking |

## Optional: Doppler for Secrets Management

For team environments, consider using [Doppler](https://www.doppler.com/) to manage env vars:

\`\`\`bash
# Install Doppler CLI, then:
doppler setup
doppler run -- ${devCmd}
\`\`\`
`;

  writeFileSync(join(projectPath, "README.md"), content);
}
