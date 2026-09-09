import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Source-map uploads require credentials; local builds must work without them.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
