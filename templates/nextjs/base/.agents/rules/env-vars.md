# Environment Variables

Never use `process.env` directly in application code. All environment variables are validated through `src/env.ts` using `@t3-oss/env-nextjs` and Zod. Import and use the `env` object instead:

```ts
import { env } from "~/env";
env.NEXT_PUBLIC_SUPABASE_URL;
```

Keep direct reads inside `src/env.ts`. Verification may forward the process environment to child commands. Any additional runtime-required exception must name the exact file in the lint configuration.
