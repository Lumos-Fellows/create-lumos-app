# Set up an app with Codex or Claude Code

Give your agent this file or its GitHub link, then say:

> Follow INSTALL.MD to create an app for me. Ask me what I need, install the
> required tools, and get the app running locally.

## Instructions for the agent

Assume the user has only their coding agent set up. Perform setup through your
local terminal with internet access.

### 1. Ask about the app

Use answers already provided. Ask the remaining questions together:

- What should the app do, what is its name, and where should it go?
- Website (Next.js) or iOS/Android (Expo)? Recommend a website if unsure.
- For websites, Notes demo or empty starter?
- Include database/sign-in helpers (Supabase), analytics (PostHog), or error
  reporting (Sentry)? Leave these off if unsure.

Default to pnpm and the offered UI components. Skip developer skills unless
requested. Create a new app folder outside the installer repository; preserve
existing files.

### 2. Install prerequisites

Detect the operating system and installed tools. **Install missing Node.js,
npm, Git, and pnpm yourself.** Use the computer's package manager or official
installers. Choose a supported Node.js LTS version that satisfies the repository's
`engines.node`; Node.js includes npm. Use the pnpm version in `packageManager`.

Execute the installation commands and confirm each tool runs in your terminal.
Ask the user to act only when blocked by required OS authentication or an
installer step you cannot control, then resume setup.

Use the supplied checkout, or clone the linked repository and select the branch
or commit from the link. Read its `AGENTS.md` before proceeding.

### 3. Create the app

From the installer repository, run:

```sh
pnpm install --frozen-lockfile
pnpm build
```

From the user's chosen parent folder, run the built CLI in an interactive
terminal. Substitute its absolute path and the chosen app name:

```sh
node "/absolute/path/to/create-lumos-app/dist/bin/cli.js" my-app
```

Use lowercase letters, numbers, and hyphens for the name, starting with a letter
or number. Answer the prompts
from the user's choices. The CLI accepts only the project name as an argument;
other choices use prompts. Resolve installation failures before continuing.
If Git needs a commit identity, ask for the user's name and email and configure
it only in the generated app.

### 4. Verify and open

Read the generated app's `AGENTS.md` and `README.md`. Follow them to run checks,
resolve failures, start the app, and verify its preview. Optional service
credentials can wait; store them only in the app's ignored environment file.

Leave the server running and give the user the app folder, preview URL, and
restart command. Report any remaining setup, including untested native previews.
