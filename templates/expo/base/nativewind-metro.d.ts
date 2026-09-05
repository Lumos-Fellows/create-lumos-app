import type { MetroConfig } from "expo/metro-config";
import type { WithCssInteropOptions } from "react-native-css-interop/metro";
// -- SENTRY_START --
import type { getSentryExpoConfig } from "@sentry/react-native/metro";
// -- SENTRY_END --

// NativeWind 4 supports Expo's Metro fork, but declares only upstream Metro types
// and incorrectly requires getCSSForPlatform, which its implementation supplies.
// These overloads retain config and option checking for the documented Expo API.
// https://www.nativewind.dev/docs/getting-started/installation
// E2E tests bundle both Expo variants to verify this integration at runtime.
type NativeWindOptions = Omit<WithCssInteropOptions, "getCSSForPlatform" | "parent"> & {
  projectRoot?: string;
  outputDir?: string;
  configPath?: string;
  cliCommand?: string;
  browserslist?: string | null;
  browserslistEnv?: string | null;
  typescriptEnvPath?: string;
  disableTypeScriptGeneration?: boolean;
};

declare module "nativewind/metro" {
  export function withNativeWind(config: MetroConfig, options: NativeWindOptions): MetroConfig;
  // -- SENTRY_START --
  export function withNativeWind(
    config: ReturnType<typeof getSentryExpoConfig>,
    options: NativeWindOptions,
  ): ReturnType<typeof getSentryExpoConfig>;
  // -- SENTRY_END --
}
