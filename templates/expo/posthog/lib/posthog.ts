import { env } from "@/env";
import PostHog from "posthog-react-native";

export const posthog = new PostHog(
  env.EXPO_PUBLIC_POSTHOG_KEY || "",
  {
    host:
      env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    disabled: !env.EXPO_PUBLIC_POSTHOG_KEY,
  }
);
