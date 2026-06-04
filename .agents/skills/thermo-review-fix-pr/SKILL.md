---
name: thermo-review-fix-pr
description: Runs a subagent-backed thermo-nuclear code quality review, implements the surfaced fixes, validates the result, and creates or updates the pull request. Use when the user asks for a thermo-nuclear review plus fix, validation, publish, create PR, or update PR loop, even if they do not explicitly ask for a subagent.
---

# Thermo Review, Fix, PR

Use this skill for the full loop:

1. delegate a strict maintainability review to a subagent
2. apply the review findings locally
3. validate the final diff
4. commit, push, and create or update the PR

## Workflow

When the user asks for this workflow:

1. Load the sibling review skill at `../thermo-nuclear-code-quality-review/SKILL.md`, or load the `thermo-nuclear-code-quality-review` skill by name if the runtime resolves skills that way.
2. If any branch, commit, push, or PR work is needed, read available repo-specific git workflow docs before publishing. Check `docs/agents/rules/git-workflow.md` first when it exists; otherwise rely on this skill's publish rules plus visible repo guidance such as `CLAUDE.md`.
3. Inspect the current branch, working tree, staged changes, remote, and existing PR state.
4. Spawn one subagent to perform a read-only thermo-nuclear review of the current branch changes.
5. While the subagent runs, do non-overlapping local checks: diff shape, obvious call sites, file sizes, targeted tests to run later.
6. Implement every actionable review finding that is in scope and technically sound.
7. Validate, commit, push, and create or update the PR.

## Subagent Review

Default to spawning a subagent when this skill is triggered. Use an explorer-style subagent when available because the review should be read-only. Skip delegation only when the user opts out, the tool is unavailable, or the review scope is too small to justify the overhead.

Give the subagent:

- repo path and current branch context
- the `thermo-nuclear-code-quality-review` skill as an attached skill item if the tool supports it
- an explicit "do not edit files" instruction
- the exact review scope: current branch changes, maintainability, abstraction quality, spaghetti growth, type boundaries, file-size thresholds, and missed simplifications
- output requirements: prioritized findings with exact file/line references and concrete remedies

If the subagent tool rejects a full-history fork plus explicit role, retry without the fork or role, following the tool's constraints.

Do not block idly while the subagent runs. Continue with local work that does not duplicate the delegated review.

## Apply Findings

Treat the review as input, not as an automatic command.

- Fix blocker and high-conviction findings unless clearly wrong or outside scope.
- Prefer structural simplifications over cosmetic edits.
- Avoid expanding the PR with unrelated refactors.
- Do not revert user or pre-existing changes.
- If the subagent reports checks it ran, do not claim them as local validation unless you also ran them.

After fixes, run another quick local audit for:

- stale imports and dead code
- remaining direct call sites the review targeted
- repeated timeout or copied-state logic
- files crossing the 1k-line threshold
- accidental unrelated changes

If the review found substantial architecture issues and the fixes were broad, consider asking the same subagent for a second read-only pass before publishing.

## Validation

Run the most focused relevant tests for the changed behavior. Also run low-cost consistency checks such as `git diff --check` and targeted `rg` searches for the old pattern.

Honor repo-specific rules, but validate explicitly before publishing. In this repo, run relevant local gates such as `pnpm test:unit` and `pnpm check`; run `pnpm lint` or `pnpm typecheck` only when those scripts exist or repo guidance explicitly requires them.

If browser QA is relevant but no authenticated session or dev server is available, state that clearly in the PR body and final response.

## Publish

- read available repo-specific git workflow docs, starting with `docs/agents/rules/git-workflow.md` when present
- inspect `git status --short --branch`
- stage explicit files only, not `git add .` or `git add -A`
- use the repo's gitmoji commit and PR title convention
- do not add AI co-author trailers unless the user explicitly asks

If the branch already has a PR, update it by committing and pushing. If no PR exists, create one against the default branch. In this repo, open ready-for-review PRs unless the user asks for draft or the change is known incomplete.

PR body should include:

- summary of what changed
- root cause or quality issue fixed
- review findings addressed
- validation actually performed locally
- explicit gaps, such as browser QA not run

## Final Response

Report:

- PR URL and number
- branch and commit SHA
- review result summary
- fixes applied from the review
- validation run and anything not run

If the platform requires git directives after successful stage, commit, push, or PR creation, include only the directives for actions that actually succeeded.
