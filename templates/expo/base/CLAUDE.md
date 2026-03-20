# CLAUDE.md

## Environment Variables

Never use `process.env` directly. All environment variables are validated through `env.ts` at the project root using Zod. Import and use the `env` object instead:

```ts
import { env } from "@/env";
env.EXPO_PUBLIC_SUPABASE_URL;
```

For platform detection, use `Platform.OS` from `react-native` instead of `process.env.EXPO_OS`.

## Styling

Use NativeWind `className` for all styling — never `StyleSheet.create()` or inline `style` objects. The only exception is React Navigation's `screenOptions` API (e.g. `tabBarStyle`) which requires plain style objects since it doesn't support `className`.

Use design tokens from `global.css` (e.g. `text-foreground`, `bg-background`, `text-muted-foreground`) rather than hardcoded colors.

## Naming

Use **kebab-case** for all file and directory names (e.g. `haptic-tab.tsx`, not `HapticTab.tsx`). The only exceptions are `_layout.tsx` and other Expo Router conventions that require specific casing.

## Stack

- **Framework**: Expo (React Native) with Expo Router
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Linter/Formatter**: Biome
- **Import alias**: `@/` maps to `./*`
