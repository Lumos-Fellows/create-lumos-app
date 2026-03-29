# Environment Variables

Never use `process.env` directly. All environment variables are validated through `env.ts` at the project root using Zod. Import and use the `env` object instead:

```ts
import { env } from "@/env";
env.EXPO_PUBLIC_SUPABASE_URL;
```

For platform detection, use `Platform.OS` from `react-native` instead of `process.env.EXPO_OS`.
