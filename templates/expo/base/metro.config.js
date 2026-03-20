const { withNativeWind } = require("nativewind/metro");
// -- SENTRY_START --
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const config = getSentryExpoConfig(__dirname);
// -- SENTRY_END --
// -- NO_SENTRY_START --
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// -- NO_SENTRY_END --

module.exports = withNativeWind(config, {
  input: "./global.css",
  configPath: "./tailwind.config.ts",
  inlineRem: 16,
});
