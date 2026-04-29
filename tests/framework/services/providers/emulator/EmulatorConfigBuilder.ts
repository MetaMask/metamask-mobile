import { Platform, type EmulatorConfig } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';

/**
 * Builder for Emulator WebDriver configuration (local Android/iOS).
 *
 * **App install behavior** (from `use.app.buildPath`):
 * - If set: `globalSetup` runs `adb` / `xcrun simctl` uninstall+install from
 * that path first, then `appium:app` points at the same path for the session.
 * - If unset: `appium:app` is omitted; Android uses package+activity, iOS uses
 * bundleId. The app must already be on the device; install checks run in
 * {@link EmulatorProvider.globalSetup}.
 * - Always `appium:fullReset: false` and `appium:noReset: true` (reset is not
 * done via these caps; see doc). [PLAYWRIGHT_LOCAL_EMULATOR.md](../../../../docs/PLAYWRIGHT_LOCAL_EMULATOR.md)
 */
export class EmulatorConfigBuilder {
  private project: ProjectConfig;

  constructor(project: ProjectConfig) {
    this.project = project;
  }

  /**
   * Build WebDriver configuration for local emulator
   */
  build() {
    const platformName = this.project.use.platform;
    const emulatorDevice = this.project.use.device as EmulatorConfig;
    if (platformName === Platform.ANDROID && !emulatorDevice.udid) {
      throw new Error(
        'Android: resolved adb serial (`udid`) is required for Appium. Set `use.device.udid` (e.g. emulator-5554) or `use.device.name` (AVD) and run through the local emulator `EmulatorProvider` so it can resolve before the session is created.',
      );
    }
    const buildPath = this.project.use.app?.buildPath;
    // - `buildPath` set: pass `appium:app` so Appium installs from that path and
    //   runs tests. Never use `fullReset` here — pairing it with `app` was causing
    //   heavy uninstall/reinstall cycles and flaky sims.
    // - No `buildPath`: omit `appium:app` and target the existing install via
    //   bundleId / package+activity. Install presence is enforced in
    //   `EmulatorProvider.globalSetup()`.
    const hasLocalApp = Boolean(buildPath);

    return {
      port: 4723,
      capabilities: {
        'appium:deviceName': emulatorDevice.name,
        'appium:udid': emulatorDevice.udid,
        'appium:automationName':
          platformName === Platform.ANDROID ? 'UIAutomator2' : 'XCUITest',
        'appium:platformVersion': emulatorDevice.osVersion,
        ...(platformName === Platform.ANDROID
          ? {
              'appium:appPackage': this.project.use.app?.packageName,
              'appium:appActivity': this.project.use.app?.launchableActivity,
            }
          : {
              'appium:bundleId': this.project.use.app?.appId,
            }),
        platformName,
        'appium:newCommandTimeout': 300,
        'appium:deviceOrientation': emulatorDevice.orientation,
        ...(hasLocalApp ? { 'appium:app': buildPath } : {}),
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': false,
        'appium:noReset': true,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:wdaLaunchTimeout': 300_000,
        'appium:includeSafariInWebviews': true,
        'appium:settings[actionAcknowledgmentTimeout]': 3000,
        'appium:settings[ignoreUnimportantViews]': true,
        'appium:settings[waitForSelectorTimeout]': 1000,
        'appium:chromedriverAutodownload': true,
        'appium:waitForQuiescence': false, // Don't wait for app idle
        'appium:animationCoolOffTimeout': 0, // Skip animation wait
        'appium:reduceMotion': true, // Reduce iOS animations
        'appium:customSnapshotTimeout': 15, // Snapshot timeout in seconds"
        'appium:waitForIdleTimeout': 0, // Don't wait for idle
        'appium:disableWindowAnimation': true, // Disable animations
        'appium:skipDeviceInitialization': true, // Skip init (faster startup)
      },
    };
  }
}
