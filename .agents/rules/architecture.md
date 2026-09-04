# Architecture decisions

- Keep the CLI in plain ESM JavaScript without a build step. Prefer Node built-ins over additional runtime dependencies so the scaffolder stays small.
- Generate TypeScript projects only; students should not need to choose a language during setup.
- Keep templates as real code files rather than introducing a template language. Students and maintainers should be able to read the files directly.
- Preserve both enabled and disabled integration paths when editing conditional sections. Raw templates may contain mutually exclusive declarations, so validate their overlaid output.
