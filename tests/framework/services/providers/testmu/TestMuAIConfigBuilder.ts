/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { TestMuConfig } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import {
  DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS,
  DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
  DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
} from '../../../Constants';
import { createLogger, LogLevel } from '../../../logger';
import { resolveTestMuDeviceCapabilities } from './TestMuDeviceResolver';

const logger = createLogger({
  name: 'TestMuAIConfigBuilder',
  level: LogLevel.INFO,
});

/**
 * Builder for TestMu AI (LambdaTest) WebDriver configuration.
 * Mirrors BrowserStackConfigBuilder so both providers stay comparable for benchmarking.
 */
export class TestMuAIConfigBuilder {
  private project: ProjectConfig;

  constructor(project: ProjectConfig) {
    this.project = project;
  }

  build() {
    const platformName = this.project.use.platform;
    const projectName = path.basename(process.cwd());
    const appUrl = this.project.use.app?.buildPath;
    const device = this.project.use.device as TestMuConfig;
    const { deviceName, platformVersion } = resolveTestMuDeviceCapabilities(
      device.name,
      device.osVersion,
    );
    const isLocal = process.env.TESTMU_LOCAL?.toLowerCase() === 'true';
    const geoLocation = process.env.TESTMU_GEO_LOCATION || 'SE';
    const tunnelName = process.env.TESTMU_TUNNEL_NAME;

    if (!appUrl) {
      throw new Error('TestMu AI app URL (buildPath) is required');
    }

    const username = process.env.LT_USERNAME;
    const accessKey = process.env.LT_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'LT_USERNAME and LT_ACCESS_KEY environment variables are required',
      );
    }

    const connectionRetryTimeoutMs = Number.parseInt(
      process.env.TESTMU_CONNECTION_RETRY_TIMEOUT_MS ?? '',
      10,
    );
    const connectionRetryTimeout = Number.isFinite(connectionRetryTimeoutMs)
      ? connectionRetryTimeoutMs
      : DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS;

    logger.info(
      `TestMu AI WebDriver connectionRetryTimeout: ${connectionRetryTimeout}ms`,
    );
    logger.info(
      `TestMu AI idleTimeout: ${DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS}s, newCommandTimeout: ${DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS}s`,
    );
    logger.info(
      `TestMu AI tunnel: ${isLocal}, geoLocation: ${isLocal ? 'disabled for tunnel sessions' : geoLocation}`,
    );
    logger.info(
      `TestMu AI device capabilities: ${deviceName} (Android/iOS ${platformVersion}) from matrix device "${device.name}" (${device.osVersion})`,
    );

    return {
      port: 443,
      path: '/wd/hub',
      protocol: 'https' as const,
      logLevel: 'warn' as const,
      user: username,
      key: accessKey,
      hostname: 'mobile-hub.lambdatest.com',
      connectionRetryTimeout,
      connectionRetryCount: 3,
      capabilities: {
        platformName,
        'appium:app': appUrl,
        'appium:deviceName': deviceName,
        'appium:platformVersion': platformVersion,
        'appium:automationName':
          platformName === 'android' ? 'UiAutomator2' : 'XCUITest',
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:newCommandTimeout':
          DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
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
        'LT:Options': {
          w3c: true,
          isRealMobile: true,
          deviceName,
          platformName,
          platformVersion,
          deviceOrientation: device.orientation ?? 'portrait',
          project:
            process.env.TESTMU_PROJECT_NAME || `${projectName} ${platformName}`,
          build:
            process.env.TESTMU_BUILD_NAME || `${projectName} ${platformName}`,
          name: `${projectName} ${platformName} test`,
          idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
          queueTimeout: 600,
          video: true,
          devicelog: true,
          network: true,
          appProfiling: true,
          ...(!isLocal ? { geoLocation } : {}),
          ...(isLocal
            ? {
                tunnel: true,
                ...(tunnelName ? { tunnelName } : {}),
              }
            : {}),
          ...(device.enableCameraImageInjection
            ? { enableImageInjection: true }
            : {}),
        },
      },
    };
  }
}
