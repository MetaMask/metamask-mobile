/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { TestMuConfig } from '../../../types';
import type { ProjectConfig } from '../../common/types';
import {
  DEFAULT_BROWSERSTACK_CONNECTION_RETRY_COUNT,
  DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS,
  DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
  DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
} from '../../../Constants';
import { createLogger, LogLevel } from '../../../logger';
import { resolveTestMuDeviceCapabilities } from './TestMuDeviceResolver.ts';

const logger = createLogger({
  name: 'TestMuAIConfigBuilder',
  level: LogLevel.INFO,
});

const DEFAULT_TESTMU_APPIUM_VERSION = '3.0.2';

/**
 * Builder for TestMu AI (LambdaTest) WebDriver configuration.
 * Mirrors BrowserStackConfigBuilder so HyperExecute and BrowserStack stay comparable.
 * Network capture stays off unless TESTMU_NETWORK_LOGS=true, matching the
 * BrowserStack performance lane.
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
    const runtimeEnv = process.env;
    const isLocal = runtimeEnv.TESTMU_LOCAL?.toLowerCase() === 'true';
    const geoLocation = runtimeEnv.TESTMU_GEO_LOCATION || 'SE';
    const tunnelName = runtimeEnv.TESTMU_TUNNEL_NAME;

    if (!appUrl) {
      throw new Error('TestMu AI app URL (buildPath) is required');
    }

    const username = runtimeEnv.LT_USERNAME;
    const accessKey = runtimeEnv.LT_ACCESS_KEY;

    if (!username || !accessKey) {
      throw new Error(
        'LT_USERNAME and LT_ACCESS_KEY environment variables are required',
      );
    }

    const connectionRetryTimeoutMs = Number.parseInt(
      runtimeEnv.TESTMU_CONNECTION_RETRY_TIMEOUT_MS ?? '',
      10,
    );
    const connectionRetryTimeout = Number.isFinite(connectionRetryTimeoutMs)
      ? connectionRetryTimeoutMs
      : DEFAULT_BROWSERSTACK_CONNECTION_RETRY_TIMEOUT_MS;

    const appiumVersion =
      runtimeEnv.TESTMU_APPIUM_VERSION?.trim() || DEFAULT_TESTMU_APPIUM_VERSION;

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
      `TestMu AI device capabilities: platformName=${platformName}, deviceName=${deviceName}, platformVersion=${platformVersion || 'unspecified'}, appiumVersion=${appiumVersion}, isRealMobile=true` +
        (runtimeEnv.TESTMU_DEVICE_EXACT?.toLowerCase() === 'true'
          ? ' (exact match)'
          : ' (availability regex)'),
    );

    const ltOptions = {
      w3c: true,
      platformName,
      deviceName,
      ...(platformVersion ? { platformVersion } : {}),
      isRealMobile: true,
      app: appUrl,
      appiumVersion,
      deviceOrientation: testMuDevice.orientation ?? 'portrait',
      project:
        runtimeEnv.TESTMU_PROJECT_NAME || `${projectName} ${platformName}`,
      build: runtimeEnv.TESTMU_BUILD_NAME || `${projectName} ${platformName}`,
      name: `${projectName} ${platformName} test`,
      idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
      queueTimeout: 600,
      video: true,
      devicelog: true,
      network: runtimeEnv.TESTMU_NETWORK_LOGS === 'true',
      appProfiling: true,
      'appium:settings[actionAcknowledgmentTimeout]': 3000,
      'appium:ignoreUnimportantViews': true,
      'appium:settings[waitForSelectorTimeout]': 1000,
      'appium:includeSafariInWebviews': true,
      'appium:chromedriverAutodownload': true,
      'appium:waitForQuiescence': false,
      'appium:animationCoolOffTimeout': 0,
      'appium:reduceMotion': true,
      'appium:customSnapshotTimeout': 15,
      'appium:settings[waitForIdleTimeout]': 0,
      'appium:settings[snapshotMaxDepth]': 62,
      'appium:disableWindowAnimation': true,
      'appium:skipDeviceInitialization': true,
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
      connectionRetryCount: DEFAULT_BROWSERSTACK_CONNECTION_RETRY_COUNT,
      capabilities: {
        platformName,
        'appium:app': appUrl,
        'appium:deviceName': deviceName,
        ...(platformVersion
          ? { 'appium:platformVersion': platformVersion }
          : {}),
        'appium:automationName':
          platformName === 'android' ? 'UiAutomator2' : 'XCUITest',
        'appium:autoGrantPermissions': true,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
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
