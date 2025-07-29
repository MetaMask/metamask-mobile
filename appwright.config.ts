// In appwright.config.ts
import { defineConfig, Platform } from "appwright";
export default defineConfig({
  testDir: "./appwright/tests",
  projects: [
    {
      name: "android",
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: "emulator", // or 'local-device' or 'browserstack'
        },
        buildPath: "app-qa-release.apk",
      },
    },
    {
      name: "ios",
      use: {
        platform: Platform.IOS,
        device: {
          provider: "emulator", // or 'local-device' or 'browserstack'
        },
        buildPath: "app-release.app", // Path to your .app file
      },
    },
    {
        name: "android-browserstack",
        use: {
          platform: Platform.ANDROID,
          device: {
            provider: "browserstack",
            // Specify device to run the tests on
            // See supported devices: https://www.browserstack.com/list-of-browsers-and-platforms/app_automate
            name: "Google Pixel 8",
            osVersion: "14.0",
          },
          buildPath: "app-release.apk",
        },
      },
  ],
});