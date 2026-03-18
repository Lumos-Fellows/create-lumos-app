import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
// -- SENTRY_START --
import * as Sentry from "@sentry/react-native";
// -- SENTRY_END --
// -- POSTHOG_START --
import { PostHogProvider } from "posthog-react-native";
// -- POSTHOG_END --

// -- SENTRY_START --
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
  });
}
// -- SENTRY_END --

export default function RootLayout() {
  return (
    <>
      {/* -- POSTHOG_START -- */}
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY || ""}
        options={{
          host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          enable: !!process.env.EXPO_PUBLIC_POSTHOG_KEY,
        }}
      >
        <Stack />
      </PostHogProvider>
      {/* -- POSTHOG_END -- */}
      {/* -- NO_POSTHOG_START -- */}
      <Stack />
      {/* -- NO_POSTHOG_END -- */}
      <StatusBar style="light" />
    </>
  );
}
