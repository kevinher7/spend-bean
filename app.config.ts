/// <reference types="node" />
import type { ExpoConfig } from "expo/config";

const isDev = process.env.APP_VARIANT === "dev";

// The release workflow sets APP_VERSION from the git tag (v0.3.0 -> 0.3.0).
const version = process.env.APP_VERSION ?? "0.0.1";
const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);

const config: ExpoConfig = {
  name: isDev ? "Spend Bean (dev)" : "Spend Bean",
  slug: "spend-bean",
  scheme: isDev ? "spend-bean-dev" : "spend-bean",
  version,
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  android: {
    // The dev build gets its own ID so it installs next to the Obtainium one.
    package: isDev ? "com.kevinher7.spendbean.dev" : "com.kevinher7.spendbean",
    // Android only installs an update with a higher versionCode.
    versionCode: major * 10_000 + minor * 100 + patch,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: ["expo-router", "expo-secure-store"],
};

export default config;
