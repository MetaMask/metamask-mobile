/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import type { ProjectConfig } from '../../common/types.ts';
import type { SauceLabsConfig } from '../../../types.ts';

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
    const sauceOptions = {
      name: `${projectName} ${platformName} test`,
      build: process.env.SAUCE_BUILD_NAME || `${projectName} ${platformName}`,
      appiumVersion: 'latest',
      deviceName: device.name,
      platformName,
      app: appUrl,
      extendedDebugging: true,
      capturePerformance: true,
      recordVideo: true,
      recordScreenshots: true,
      ...(device.orientation ? { orientation: device.orientation } : {}),
    };

    return {
      protocol: 'https' as const,
      hostname:
        process.env.SAUCE_HOSTNAME || 'ondemand.us-west-1.saucelabs.com',
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
        'sauce:options': sauceOptions,
        ...(device.otherApps && device.otherApps.length > 0
          ? { 'appium:otherApps': device.otherApps }
          : {}),
      },
    };
  }
}
