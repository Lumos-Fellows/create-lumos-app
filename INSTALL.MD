# Set up an app with Codex or Claude Code

Give your agent this file or its GitHub link, then say:

> Follow INSTALL.MD to create an app for me. Ask me about the app, install any
> missing prerequisites, and get it running locally.

You only need your coding agent set up with access to a local terminal and the
internet. It will handle the steps below. A service account is not required to
run the starter app.

## Instructions for the agent

Complete setup, rather than only returning commands. Use the repository checkout
the user provided. If they provided a GitHub link, clone that repository and use
the branch or commit in their link. This keeps setup aligned with the templates
they selected, including changes that are not published to npm yet.

### 1. Ask about the app

Use answers already provided. Ask the remaining questions together in plain
language:

- What should the app do?
- What should it be called, and where should its folder go?
- Is it a website or an iOS/Android app? Recommend a website if they are unsure.
- Do they want a working Notes demo or an empty starting point? This choice is
  available for websites; mobile apps use the default starter.
- Do they need a database and sign-in, usage analytics, or error reporting now?
  Explain these as optional services. Leave them off if the user is unsure.

Translate their answers into installer choices:

| Choice | Installer setting |
| --- | --- |
| Website | Next.js |
| iOS/Android app | Expo |
| Notes demo / empty website | Basic Notes App / Bare |
| Database and sign-in helpers | Supabase |
| Usage analytics | PostHog |
| Error reporting | Sentry |

Use pnpm and include the offered UI components unless the user prefers otherwise.
Skip optional developer skills unless requested. Choose a folder name with
lowercase letters, numbers, and hyphens, starting with a letter or number.
Create the app outside the installer repository, in a new folder. Do not use
`.` or overwrite an existing project.

### 2. Prepare the computer

Check the operating system and whether Node.js, npm, Git, and pnpm are available.
Do not assume that installing a coding agent installed these tools.

- Use an existing Node.js version if it satisfies this checkout's
  `package.json` `engines.node`. For a fresh installation, use Node.js 24 LTS
  from the [official Node.js download page](https://nodejs.org/en/download),
  which includes npm.
- Install missing Git using the [official Git installation instructions](https://git-scm.com/install/).
- Install the pnpm version specified by this checkout's `packageManager` field.
  For this checkout, use `npm install --global pnpm@10.29.3` if pnpm is missing.
  See the [pnpm installation instructions](https://pnpm.io/installation) if the
  computer requires a different installation method.

Use the computer's existing installation method when possible. If an installer
requires a user action you cannot perform, give that one step, then continue
afterward. Recheck tool versions in the terminal that will run setup.

### 3. Build and run the installer

Read the checkout's `AGENTS.md`. From the installer repository, run:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Record the absolute path to `dist/bin/cli.js`. Switch to the parent folder where
the user wants their app, then run the built CLI in an interactive terminal:

```sh
node "/absolute/path/to/create-lumos-app/dist/bin/cli.js" my-app
```

Replace the path and `my-app` with the actual values. Answer each prompt from
the user's choices. The project name is the only positional argument; do not
invent flags such as `--framework` or pipe a fixed answer list into the prompts.
If your terminal tool cannot interact with prompts, have the user run this
command in their terminal, then resume setup when it finishes.

Wait for installation to finish and inspect errors or warnings. Do not treat
an existing folder as proof that setup succeeded. If a run fails, diagnose it
before retrying; do not delete the folder without the user's approval.

### 4. Verify and open the app

Work from the generated app folder and read its `AGENTS.md` and `README.md`.
Keep service credentials in its ignored `.env.local`, never in chat or source
control. Selected integrations can remain unconfigured for the first local run;
connecting real accounts is a separate step. Adding Supabase helpers does not
create the user's application database schema or a complete sign-in flow.

Run `pnpm verify` and resolve setup failures before claiming success. If the user
chose npm, use `npm run verify` instead. If Git reports a missing commit identity,
ask for the user's name and email before configuring them for this app only.

For a website, start `pnpm dev` (or `npm run dev`). Open the URL printed by the
server and confirm that the starter page loads without a runtime error. For the
Notes demo, also check that a note persists after a reload.

For Expo, start `npx expo start` and use the terminal's preview options. Confirm
a browser preview if available. A running development server alone does not
verify a native app: report any device, emulator, or development-build setup
still needed before testing on iOS or Android.

Leave the development server running. Tell the user the app's folder, how to
open it, how to start it again, and any remaining setup. Have them open the
generated folder in their coding agent for further work. Distinguish a working
starter from the features they still need to build.
