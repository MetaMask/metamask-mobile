/* eslint-disable import/no-nodejs-modules */
import path from 'path';
import type { BrowserStackConfig } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';

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

    return {
      port: 443,
      path: '/wd/hub',
      protocol: 'https',
      logLevel: 'warn' as const,
      user: username,
      key: accessKey,
      hostname: 'hub.browserstack.com',
      capabilities: {
        'bstack:options': {
          debug: true,
          local: false, // To be implemented
          interactiveDebugging: true,
          networkLogs: true,
          appiumVersion: '2.6.0', // BrowserStack doesn't support Appium 3 yet
          idleTimeout: 180,
          deviceName: device.name,
          osVersion: device.osVersion,
          platformName,
          deviceOrientation: device.orientation,
          buildName:
            process.env.BROWSERSTACK_BUILD_NAME ||
            `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === 'true' ? '' : process.env.USER,
          appProfiling: 'true',
          selfHeal: 'true',
          networkProfile: '4g-lte-advanced-good',
          geoLocation: 'FR',
        },
        'appium:autoGrantPermissions': true,
        'appium:app': appBsUrl,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:settings[actionAcknowledgmentTimeout]': 3000,
        'appium:settings[ignoreUnimportantViews]': true,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:settings[waitForSelectorTimeout]': 1000,
        'appium:includeSafariInWebviews': true,
        'appium:chromedriverAutodownload': true,
        'appium:waitForQuiescence': false, // Don't wait for app idle
        'appium:animationCoolOffTimeout': 0, // Skip animation wait
        'appium:reduceMotion': true, // Reduce iOS animations
        'appium:customSnapshotTimeout': 15, // Snapshot timeout in seconds"
        'appium:waitForIdleTimeout': 0, // Don't wait for idle
        'appium:disableWindowAnimation': true, // Disable animations
        'appium:skipDeviceInitialization': true, // Skip init (faster startup)
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
