/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { BrowserStackConfig } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import {
  DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS,
  DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
  DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
} from '../../../Constants';
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
    const appBsUrl = this.project.use.app?.buildPath;
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

    const connectionRetryTimeoutMs = Number.parseInt(
      process.env.BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS ?? '',
      10,
    );
    const connectionRetryTimeout = Number.isFinite(connectionRetryTimeoutMs)
      ? connectionRetryTimeoutMs
      : DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS;

    logger.info(
      `BrowserStack WebDriver connectionRetryTimeout: ${connectionRetryTimeout}ms`,
    );
    logger.info(
      `BrowserStack idleTimeout: ${DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS}s, newCommandTimeout: ${DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS}s`,
    );

    return {
      port: 443,
      path: '/wd/hub',
      protocol: 'https',
      logLevel: 'warn' as const,
      user: username,
      key: accessKey,
      hostname: 'hub.browserstack.com',
      // Default webdriver is 120s; BS session POST often exceeds that on busy grids.
      connectionRetryTimeout,
      connectionRetryCount: 3,
      capabilities: {
        'bstack:options': {
          debug: true,
          local: process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true',
          interactiveDebugging: true,
          networkLogsOptions: {
            captureContent: true,
          },
          networkLogs: true,
          appiumVersion: '3.1.0',
          idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
          deviceName: device.name,
          osVersion: device.osVersion,
          platformName,
          deviceOrientation: device.orientation,
          projectName:
            process.env.BROWSERSTACK_BUILD_NAME ||
            `${projectName} ${platformName}`,
          buildName:
            process.env.BROWSERSTACK_BUILD_NAME ||
            `${projectName} ${platformName}`,
          sessionName: `${projectName} ${platformName} test`,
          buildIdentifier:
            process.env.GITHUB_ACTIONS === 'true' ? '' : process.env.USER,
          appProfiling: true,
          selfHeal: device.selfHeal ?? true,
          networkProfile: '4g-lte-advanced-good',
          ...(process.env.BROWSERSTACK_LOCAL?.toLowerCase() !== 'true'
            ? { geoLocation: process.env.BROWSERSTACK_GEO_LOCATION || 'ES' }
            : {}),
          enableCameraImageInjection: device.enableCameraImageInjection,
          ...(process.env.BROWSERSTACK_LOCAL_IDENTIFIER
            ? { localIdentifier: process.env.BROWSERSTACK_LOCAL_IDENTIFIER }
            : {}),
        },
        ...(device.otherApps && device.otherApps.length > 0
          ? { 'appium:otherApps': device.otherApps as string[] }
          : {}),
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
        'appium:newCommandTimeout':
          DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
        'appium:automationName':
          platformName === 'android' ? 'UiAutomator2' : 'XCUITest',
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
        'appium:customSnapshotTimeout': 15,
        'appium:waitForIdleTimeout': 0, // Don't wait for idle
        'appium:disableWindowAnimation': true, // Disable animations
        'appium:skipDeviceInitialization': true, // Skip init (faster startup)
        'appium:bstackPageSource': {
          enable: true,
          samplesX: 3,
          samplesY: 3,
          maxDepth: 100,
        },
      },
    };
  }
}
