# Common Tasks

- **Add a new integration**: Add template files under `templates/<framework>/<name>/`, add deps to `integrations.mjs`, add env vars to `getEnvVars()`, add marker comments in layout/env templates, add the prompt toggle in `prompts.mjs`.
- **Modify generated code**: Edit the files directly in `templates/`. What's in the template is what gets copied.
- **Change a prompt default**: Edit `prompts.mjs` — each prompt has an `initialValue`.
