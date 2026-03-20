import { env } from "@/env";
import * as Sentry from "@sentry/react-native";

export function initSentry() {
  if (env.EXPO_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: env.EXPO_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0,
    });
  }
}
