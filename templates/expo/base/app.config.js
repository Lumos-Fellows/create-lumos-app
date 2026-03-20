const config = require("./app.config.values.js");

module.exports = {
  expo: {
    name: config.name,
    slug: config.slug,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: config.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: config.bundleIdentifier,
    },
    android: {
      package: config.package,
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    web: { output: "static", favicon: "./assets/images/favicon.png" },
    plugins: [
      ["expo-dev-client", { launchMode: "most-recent" }],
      "expo-router",
      "expo-system-ui",
    ],
    experiments: { typedRoutes: true },
  },
};
