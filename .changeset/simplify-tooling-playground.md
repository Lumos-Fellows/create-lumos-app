---
"create-lumos-app": patch
---

Bundle lint plugins directly and share JSX rule traversal. Return updated playground state from each action and remove redundant internal checks and disabled debug code.

Keep Tailwind's PostCSS configuration in the web template so Sentry apps retain CSS processing when upstream starter defaults change.

Skip the upstream starters' dependency installs. Apply templates first, then let package setup install the final dependencies.
