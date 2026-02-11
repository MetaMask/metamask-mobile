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

    return {
      port: 4723,
      capabilities: {
        'appium:deviceName': device.name,
        'appium:udid': device.udid,
        'appium:automationName':
          platformName === Platform.ANDROID ? 'UIAutomator2' : 'XCUITest',
        'appium:platformVersion': device.osVersion,
        'appium:appActivity': this.project.use.launchableActivity,
        'appium:appPackage': device.packageName,
        platformName,
        'appium:autoGrantPermissions': true,
        'appium:app': this.project.use.buildPath,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:deviceOrientation': device.orientation,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:wdaLaunchTimeout': 300_000,
        'appium:includeSafariInWebviews': true,
        'appium:chromedriverAutodownload': true,
      },
    };
  }
}
