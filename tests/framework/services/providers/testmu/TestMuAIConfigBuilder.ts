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
    const testMuDevice = this.project.use.device as TestMuConfig;
    const { deviceName, platformVersion } = resolveTestMuDeviceCapabilities(
      testMuDevice.name,
      testMuDevice.osVersion,
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
      `TestMu AI device capabilities: platformName=${platformName}, deviceName=${deviceName}, platformVersion=${platformVersion}, isRealMobile=true`,
    );

    const ltOptions = {
      w3c: true,
      platformName,
      deviceName,
      platformVersion,
      isRealMobile: true,
      app: appUrl,
      deviceOrientation: testMuDevice.orientation ?? 'portrait',
      project:
        process.env.TESTMU_PROJECT_NAME || `${projectName} ${platformName}`,
      build: process.env.TESTMU_BUILD_NAME || `${projectName} ${platformName}`,
      name: `${projectName} ${platformName} test`,
      idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
      queueTimeout: 600,
      video: true,
      devicelog: true,
      network: true,
      appProfiling: true,
      ...(platformName === 'android' ? { autoGrantPermissions: true } : {}),
      ...(!isLocal ? { geoLocation } : {}),
      ...(isLocal
        ? {
            tunnel: true,
            ...(tunnelName ? { tunnelName } : {}),
          }
        : {}),
      ...(testMuDevice.enableCameraImageInjection
        ? { enableImageInjection: true }
        : {}),
    };

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
        // Keep top-level caps W3C/Appium-compliant; vendor-specific keys go in LT:Options.
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
        ...(testMuDevice.otherApps && testMuDevice.otherApps.length > 0
          ? { 'appium:otherApps': testMuDevice.otherApps as string[] }
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
        'LT:Options': ltOptions,
      },
    };
  }
}
