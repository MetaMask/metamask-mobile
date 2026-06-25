import { Platform, type EmulatorConfig } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { getAppiumHost, getAppiumPort } from '../../appium/AppiumServer.ts';

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
    // - iOS CI: globalSetup already simctl-installs from `buildPath`; set
    //   IOS_APPIUM_USE_BUNDLE_ID_ONLY=true to skip a redundant Appium-side install.
    // - Android CI: globalSetup already adb-installs; set
    //   ANDROID_APPIUM_USE_PACKAGE_ONLY=true to avoid a second install at session start.
    const hasLocalApp = Boolean(buildPath);
    const skipIosAppiumAppInstall =
      platformName === Platform.IOS &&
      process.env.IOS_APPIUM_USE_BUNDLE_ID_ONLY === 'true';
    const skipAndroidAppiumAppInstall =
      platformName === Platform.ANDROID &&
      process.env.ANDROID_APPIUM_USE_PACKAGE_ONLY === 'true';
    const usePreinstalledWda =
      platformName === Platform.IOS &&
      process.env.IOS_WDA_PREINSTALLED === 'true';
    const usePrebuiltWda =
      platformName === Platform.IOS &&
      process.env.USE_PREBUILT_WDA === 'true' &&
      !usePreinstalledWda;

    return {
      hostname: getAppiumHost(),
      port: getAppiumPort(),
      // XCUITest driver must build and install WDA on first run (3-4 min on
      // local, up to 10 min on CI). Raise the WebDriverIO HTTP timeout so the
      // session-creation POST doesn't time out before Appium responds.
      // connectionRetryCount: 0 — no retries on session creation; a timeout
      // here is not a transient error and retrying just doubles the wait.
      // Preinstalled WDA: prepare-ios-appium-runner already launched WDA on CI.
      // Must exceed wdaLaunchTimeout (120 s) + wdaConnectionTimeout (30 s) = 150 s
      // so the client doesn't abort before Appium finishes the WDA handshake.
      // Prebuilt/cold paths still need minutes for xcodebuild or first launch.
      connectionRetryTimeout: usePreinstalledWda
        ? 3 * 60 * 1000
        : usePrebuiltWda
          ? 5 * 60 * 1000
          : 12 * 60 * 1000,
      connectionRetryCount: 0,
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
              // Release E2E launches with many intent extras; default 20s adbExecTimeout
              // is too low on CI after a prior test (see appium-accounts-android-smoke).
              'appium:adbExecTimeout': 120_000,
            }
          : {
              'appium:bundleId': this.project.use.app?.appId,
            }),
        platformName,
        'appium:newCommandTimeout': 300,
        'appium:deviceOrientation': emulatorDevice.orientation,
        ...(hasLocalApp &&
        !skipIosAppiumAppInstall &&
        !skipAndroidAppiumAppInstall
          ? { 'appium:app': buildPath }
          : {}),
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': false,
        'appium:noReset': true,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:waitForQuiescence': false, // Don't wait for app idle
        'appium:animationCoolOffTimeout': 0, // Skip animation wait
        'appium:reduceMotion': true, // Reduce iOS animations
        'appium:waitForIdleTimeout': 0, // Don't wait for idle
        ...(usePreinstalledWda
          ? {
              // WDA was simctl-installed in prepare-ios-appium-runner; launch only.
              'appium:usePreinstalledWDA': true,
              'appium:updatedWDABundleId':
                process.env.IOS_WDA_BUNDLE_ID?.trim() ||
                'com.facebook.WebDriverAgentRunner',
              // CI evidence shows intermittent WDA launch/proxy timeouts at 60s/10s.
              // Give the preinstalled path more room on loaded runners.
              'appium:wdaLaunchTimeout': 120_000,
              'appium:wdaConnectionTimeout': 30_000,
              'appium:simulatorStartupTimeout': 180_000,
            }
          : usePrebuiltWda
            ? {
                // Prebuilt WDA on CI: xcodebuild test-without-building (~minutes).
                'appium:wdaLaunchTimeout': 120_000,
                'appium:wdaConnectionTimeout': 30_000,
                // Sim is booted in getDriver(); this covers XCUITest attach on loaded CI hosts.
                'appium:simulatorStartupTimeout': 240_000,
              }
            : {
                // Cold WDA build (local dev / cache miss): allow up to 10 min.
                'appium:wdaLaunchTimeout': 10 * 60_000,
                'appium:simulatorStartupTimeout': 10 * 60_000,
              }),
        // Pin WDA's DerivedData to a fixed path so CI can cache and restore it.
        // When USE_PREBUILT_WDA=true (set by CI after prebuild/cache hit), xcuitest-driver
        // skips xcodebuild entirely and installs+launches the cached WDA binary
        // directly — cutting ~8 min off CI per run. Without it, xcodebuild runs
        // even when DerivedData is present because actions/cache restores files
        // with current timestamps, causing a full rebuild.
        ...(platformName === Platform.IOS
          ? {
              'appium:derivedDataPath': `${process.env.HOME ?? '~'}/appium-wda`,
              'appium:skipLogCapture': true,
              ...(usePreinstalledWda
                ? {
                    'appium:useNewWDA': false,
                    'appium:showXcodeLog': false,
                  }
                : usePrebuiltWda
                  ? {
                      'appium:usePrebuiltWDA': true,
                      // Reuse a WDA instance already listening on the sim (retries / multi-test).
                      'appium:useNewWDA': false,
                      'appium:showXcodeLog': false,
                    }
                  : {}),
            }
          : {}),
        'appium:includeSafariInWebviews': true,
        'appium:settings[actionAcknowledgmentTimeout]': 3000,
        'appium:settings[ignoreUnimportantViews]': true,
        'appium:settings[waitForSelectorTimeout]': 1000,
        'appium:chromedriverAutodownload': true,
        'appium:customSnapshotTimeout': 15, // Snapshot timeout in seconds
        'appium:disableWindowAnimation': true, // Disable animations
        'appium:skipDeviceInitialization': true, // Skip init (faster startup)
      },
    };
  }
}
