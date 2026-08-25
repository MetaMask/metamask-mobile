/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { ProjectConfig } from '../../common/types.ts';
import type { SauceLabsConfig } from '../../../types.ts';
import {
  DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
  DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
} from '../../../Constants';

/**
 * Builder for Sauce Labs WebDriver configuration.
 * Appium performance settings mirror TestMu HE / BrowserStack so provider
 * benchmarks stay comparable (waitForIdleTimeout, animations, etc.).
 */
export class SauceLabsConfigBuilder {
  constructor(private readonly project: ProjectConfig) {}

  build() {
    const device = this.project.use.device as SauceLabsConfig;
    const appUrl = this.project.use.app?.buildPath;
    // Bracket access keeps Jest/runtime environment values dynamic.
    // eslint-disable-next-line dot-notation
    const username = process.env[String('SAUCE_USERNAME')];
    // eslint-disable-next-line dot-notation
    const accessKey = process.env[String('SAUCE_ACCESS_KEY')];

    if (!appUrl) {
      throw new Error('Sauce Labs app URL (buildPath) is required');
    }
    if (!username || !accessKey) {
      throw new Error(
        'SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are required',
      );
    }

    const platformName = this.project.use.platform;
    const projectName = path.basename(process.cwd());
    const privateDevicesOnly =
      process.env.SAUCE_PRIVATE_DEVICES_ONLY?.toLowerCase() !== 'false';
    const sauceOptions = {
      name: `${projectName} ${platformName} test`,
      build: process.env.SAUCE_BUILD_NAME || `${projectName} ${platformName}`,
      appiumVersion: 'latest',
      deviceName: device.name,
      platformName,
      app: appUrl,
      idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
      extendedDebugging: true,
      capturePerformance: true,
      recordVideo: true,
      recordScreenshots: true,
      ...(privateDevicesOnly
        ? { privateDevicesOnly: true }
        : { publicDevicesOnly: true }),
      ...(device.orientation ? { orientation: device.orientation } : {}),
    };

    return {
      protocol: 'https' as const,
      hostname:
        process.env.SAUCE_HOSTNAME || 'ondemand.eu-central-1.saucelabs.com',
      port: 443,
      path: '/wd/hub',
      user: username,
      key: accessKey,
      logLevel: 'warn' as const,
      connectionRetryTimeout: 300_000,
      connectionRetryCount: 3,
      capabilities: {
        platformName,
        'appium:app': appUrl,
        'appium:deviceName': device.name,
        'appium:automationName':
          platformName === 'android' ? 'UiAutomator2' : 'XCUITest',
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:newCommandTimeout':
          DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
        // Performance Appium settings (parity with TestMu HE / BrowserStack)
        'appium:settings[actionAcknowledgmentTimeout]': 3000,
        'appium:settings[ignoreUnimportantViews]': true,
        'appium:settings[waitForSelectorTimeout]': 1000,
        'appium:settings[waitForIdleTimeout]': 0,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:includeSafariInWebviews': true,
        'appium:chromedriverAutodownload': true,
        'appium:waitForQuiescence': false,
        'appium:animationCoolOffTimeout': 0,
        'appium:reduceMotion': true,
        'appium:customSnapshotTimeout': 15,
        'appium:disableWindowAnimation': true,
        'appium:skipDeviceInitialization': true,
        ...(platformName === 'android'
          ? {
              'appium:appPackage': this.project.use.app?.packageName,
              'appium:appActivity': this.project.use.app?.launchableActivity,
              'appium:disableIdLocatorAutocompletion': true,
            }
          : {
              'appium:bundleId': this.project.use.app?.appId,
              'appium:shouldUseCompactResponses': true,
              'appium:elementResponseAttributes':
                'name,label,value,type,enabled,visible,rect',
            }),
        'sauce:options': sauceOptions,
        ...(device.otherApps && device.otherApps.length > 0
          ? { 'appium:otherApps': device.otherApps }
          : {}),
      },
    };
  }
}
