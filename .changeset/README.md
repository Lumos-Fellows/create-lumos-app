# Releases

Add a Changeset to each pull request with `pnpm changeset`. Choose a patch, minor,
or major bump for `create-lumos-app` and describe the change for package users.
CI checks that the pull request includes a new Changeset.

For changes that intentionally do not need an npm release, use
`pnpm changeset --empty` instead.

After a merge to `main`, the Publish package workflow waits for CI to pass,
applies pending Changesets, commits the version and changelog, and publishes to
npm using trusted publishing. It does not create a new version without a
Changeset. A failed CI run prevents publishing.

If publishing fails after the version commit, run the Publish package workflow
manually on `main` to retry the unpublished version.
