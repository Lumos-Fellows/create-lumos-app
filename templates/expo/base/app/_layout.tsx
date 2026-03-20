import "@/global.css";
import { env } from "@/env";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// -- SENTRY_START --
import * as Sentry from "@sentry/react-native";
// -- SENTRY_END --
// -- POSTHOG_START --
import { PostHogProvider } from "posthog-react-native";
// -- POSTHOG_END --
// -- SENTRY_START --
if (env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}
// -- SENTRY_END --

export default function RootLayout() {
  return (
    <>
      {/* -- POSTHOG_START -- */}
      <PostHogProvider
        apiKey={env.EXPO_PUBLIC_POSTHOG_KEY || ""}
        options={{
          host: env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          disabled: !env.EXPO_PUBLIC_POSTHOG_KEY,
        }}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </PostHogProvider>
      {/* -- POSTHOG_END -- */}
      {/* -- NO_POSTHOG_START -- */}
      <Stack screenOptions={{ headerShown: false }} />
      {/* -- NO_POSTHOG_END -- */}
      <StatusBar style="light" />
    </>
  );
}
