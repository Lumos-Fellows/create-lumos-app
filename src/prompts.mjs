import * as p from "@clack/prompts";
import pc from "picocolors";
import { detectPackageManager, validateProjectName } from "./utils.mjs";

/**
 * Run the interactive prompts and return the user's choices.
 * @param {string[]} args - CLI positional args
 */
export async function gatherOptions(args) {
  p.intro(pc.bgCyan(pc.black(" create-lumos-app ")));

  const nameFromArg = args[0];

  const project = await p.group(
    {
      name: () => {
        if (nameFromArg) {
          const err = validateProjectName(nameFromArg);
          if (err) {
            p.log.warn(`Invalid project name "${nameFromArg}": ${err}`);
            return p.text({
              message: 'Project name (use "." for current directory)',
              placeholder: "my-lumos-app",
              validate: validateProjectName,
            });
          }
          if (nameFromArg === ".") {
            p.log.info(`Scaffolding in ${pc.cyan("current directory")}`);
          } else {
            p.log.info(`Project name: ${pc.cyan(nameFromArg)}`);
          }
          return Promise.resolve(nameFromArg);
        }
        return p.text({
          message: 'Project name (use "." for current directory)',
          placeholder: "my-lumos-app",
          validate: validateProjectName,
        });
      },

      framework: () =>
        p.select({
          message: "Which framework?",
          options: [
            { value: "nextjs", label: "Next.js", hint: "web app" },
            { value: "expo", label: "Expo", hint: "iOS/android app" },
          ],
        }),

      packageManager: () => {
        const detected = detectPackageManager();
        return p.select({
          message: "Package manager",
          options: [
            {
              value: "pnpm",
              label: "pnpm",
              hint:
                detected === "pnpm" ? "recommended, detected" : "recommended",
            },
            { value: "npm", label: "npm" },
          ],
        });
      },

      shadcn: ({ results }) =>
        results.framework === "nextjs"
          ? p.confirm({
              message: "Add shadcn/ui components?",
              initialValue: true,
            })
          : Promise.resolve(false),

      supabase: () =>
        p.confirm({
          message: "Add Supabase?",
          initialValue: true,
        }),

      posthog: () =>
        p.confirm({
          message: "Add PostHog analytics?",
          initialValue: false,
        }),

      sentry: () =>
        p.confirm({
          message: "Add Sentry error tracking?",
          initialValue: false,
        }),

      skills: () =>
        p.confirm({
          message: "Install developer skills via skills.sh?",
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled.");
        process.exit(0);
      },
    },
  );

  return project;
}
