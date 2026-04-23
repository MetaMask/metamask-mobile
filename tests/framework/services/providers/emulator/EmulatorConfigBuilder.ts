import { Platform, type EmulatorConfig } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';

/**
 * Builder for Emulator WebDriver configuration
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
    const device = this.project.use.device as EmulatorConfig;
    const buildPath = this.project.use.app?.buildPath;
    // fullReset + no `app` path uninstalls the app and wipes data, then
    // XCUITest cannot reinstall — local sessions fail/retry and the simulator
    // can look like it is crashing/resetting in a loop. Only full-reset when
    // we have a local binary to install; otherwise attach to the existing install.
    const hasLocalApp = Boolean(buildPath);

    return {
      port: 4723,
      capabilities: {
        'appium:deviceName': device.name,
        'appium:udid': device.udid,
        'appium:automationName':
          platformName === Platform.ANDROID ? 'UIAutomator2' : 'XCUITest',
        'appium:platformVersion': device.osVersion,
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
        'appium:deviceOrientation': device.orientation,
        ...(hasLocalApp ? { 'appium:app': buildPath } : {}),
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': hasLocalApp,
        'appium:noReset': !hasLocalApp,
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
