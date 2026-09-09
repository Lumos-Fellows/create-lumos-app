---
"create-lumos-app": patch
---

Enforce validated environment access in generated Next.js and Expo application code. Generate Next.js route types before typechecking, including on fresh checkouts. Add Knip to find unused application code and dependencies.

Add targeted UI-copy and routing lint checks, preserve action labels during loading, and reject nested ternaries.

Wire Sentry across Next.js runtimes and keep optional integrations inactive until configured, so generated apps start without external service credentials.

Check that maintained source belongs to a strict TypeScript program, and restrict JavaScript to typechecked runtime configuration.
