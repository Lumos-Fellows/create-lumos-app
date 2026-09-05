# create-lumos-app

This CLI helps Lumos Fellows students start building with as little setup confusion as possible. Preserve that experience when changing defaults or generated projects.

## Working agreements

- Keep shared agent instructions here and in `.agents/rules/`. `CLAUDE.md` must contain only `@AGENTS.md`; `.claude/` holds Claude-specific configuration and hook wiring.
- Use pnpm for work on this repo.
- After changing `src/` or `templates/`, run `pnpm typecheck`, `pnpm test:unit`, `pnpm lint`, and `pnpm test`. `pnpm verify` runs the complete verification sequence and is also used by Claude's Stop hook. CI must enforce checks independently of the harness.
- Include a Changeset in every PR; use an empty Changeset for changes that intentionally do not need a release.

## Documentation

Only add information to the repository README.md that cannot be inferred directly from the source code or configuration. Use it for project purpose, rationale, and external context; do not restate scripts, dependencies, file paths, or implementation details. Keep agent guidance focused on constraints, rationale, exceptions, and recurring mistakes.

## Rules Index

Before starting work, read each rules file whose scope applies to the task. `.agents/rules/` is an organizational convention; do not assume a harness automatically loads its files. When adding, updating, or deleting a rules file, keep this index in sync.

- Before changing CLI architecture or scaffolding, read [architecture.md](.agents/rules/architecture.md).
- Before editing templates, integrations, or generated tooling, read [conventions.md](.agents/rules/conventions.md).
- Before changing validation or preparing a PR, read [testing.md](.agents/rules/testing.md).
