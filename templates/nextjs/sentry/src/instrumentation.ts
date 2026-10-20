import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Next replaces NEXT_RUNTIME at build time to separate Node and Edge imports.
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
