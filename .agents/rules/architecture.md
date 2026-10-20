# Architecture decisions

- Maintain CLI code, tests, and verification helpers in strict TypeScript. Compile the published CLI to JavaScript so students do not need a TypeScript loader to run the scaffolder.
- Validate untyped external data at its boundary instead of asserting it has the expected shape. Do not use `any` or compiler suppression comments to bypass checks.
- Generate TypeScript projects only; students should not need to choose a language during setup.
- Keep templates as real code files rather than introducing a template language. Students and maintainers should be able to read the files directly.
- Preserve both enabled and disabled integration paths when editing conditional sections. Raw templates may contain mutually exclusive declarations, so validate their overlaid output.
