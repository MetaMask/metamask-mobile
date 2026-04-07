/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import { Platform, type BrowserStackConfig } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import { createLogger, LogLevel } from '../../../logger';

const logger = createLogger({
  name: 'BrowserStackConfigBuilder',
  level: LogLevel.INFO,
});

/**
 * Builder for BrowserStack WebDriver configuration
 */
export class BrowserStackConfigBuilder {
  private project: ProjectConfig;

  constructor(project: ProjectConfig) {
    this.project = project;
  }

  /**
   * Build WebDriver configuration for BrowserStack
   */
  build() {
    const platformName = this.project.use.platform;
    const projectName = path.basename(process.cwd());
    const appBsUrl = this.project.use.buildPath;
    const device = this.project.use.device as BrowserStackConfig;

    if (!appBsUrl) {
      throw new Error('BrowserStack app URL (buildPath) is required');
    }

    const username = process.env.BROWSERSTACK_USERNAME;
    const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables are required',
      );
    }

    logger.debug(
      `Building BrowserStack config with device name: ${device.name}`,
    );
    logger.debug(
      `Building BrowserStack config with device os version: ${device.osVersion}`,
    );
    logger.debug(
      `Building BrowserStack config with device orientation: ${device.orientation}`,
    );
    logger.debug(
      `Building BrowserStack config with device platform name: ${platformName}`,
    );
    logger.debug(
      `Building BrowserStack config with device build name: ${process.env.BROWSERSTACK_BUILD_NAME || `${projectName} ${platformName}`}`,
    );
    logger.debug(
      `Building BrowserStack config with device session name: ${`${projectName} ${platformName} test`}`,
    );
    logger.debug(
      `Building BrowserStack config with device build identifier: ${process.env.GITHUB_ACTIONS === 'true' ? `CI ${process.env.GITHUB_RUN_ID}` : process.env.USER}`,
    );

    return {
      port: 443,
      path: '/wd/hub',
      protocol: 'https',
      logLevel: 'warn' as const,
      user: username,
      key: accessKey,
      hostname: 'hub.browserstack.com',
      capabilities: {
        // W3C standard capability — must be at the top level
        platformName: platformName === 'android' ? 'Android' : 'iOS',

        // BrowserStack vendor capabilities
        'bstack:options': {
          debug: true,
          local: true,
          interactiveDebugging: true,
          networkLogsOptions: {
            captureContent: true,
          },
          networkLogs: true,
          appiumVersion: '3.1.0',
          idleTimeout: 180,
          deviceName: device.name,
          osVersion: device.osVersion,
          deviceOrientation: device.orientation,
          buildName:
            process.env.BROWSERSTACK_BUILD_NAME ||
            `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === 'true' ? '' : process.env.USER,
          appProfiling: true,
          selfHeal: true,
          networkProfile: '4g-lte-advanced-good',
          // geoLocation: process.env.BROWSERSTACK_GEO_LOCATION || 'ES',
          enableCameraImageInjection: device.enableCameraImageInjection,
          ...(process.env.BROWSERSTACK_RN_PLAYGROUND_URL
            ? { otherApps: [process.env.BROWSERSTACK_RN_PLAYGROUND_URL] }
            : {}),
        },

        // Appium capabilities
        'appium:deviceName': device.name,
        'appium:platformVersion': device.osVersion,
        'appium:automationName':
          platformName === Platform.ANDROID ? 'UiAutomator2' : 'XCUITest',
        'appium:app': appBsUrl,
        ...(platformName === 'android'
          ? {
              'appium:appPackage': this.project.use.app?.packageName,
              'appium:appActivity': this.project.use.app?.launchableActivity,
            }
          : {
              'appium:bundleId': this.project.use.app?.appId,
            }),
        'appium:newCommandTimeout': 300,
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:settings[actionAcknowledgmentTimeout]': 3000,
        'appium:settings[ignoreUnimportantViews]': true,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:settings[waitForSelectorTimeout]': 1000,
        'appium:includeSafariInWebviews': true,
        'appium:chromedriverAutodownload': true,
        'appium:waitForQuiescence': false,
        'appium:animationCoolOffTimeout': 0,
        'appium:reduceMotion': true,
        'appium:customSnapshotTimeout': 15,
        'appium:waitForIdleTimeout': 0,
        'appium:disableWindowAnimation': true,
        'appium:skipDeviceInitialization': true,
        'appium:bstackPageSource': {
          enable: true,
          samplesX: 3,
          samplesY: 3,
          maxDepth: 15,
        },
      },
    };
  }
}
