import {
  WebDriverConfig,
  Platform,
  EmulatorConfig,
} from '../../../e2e/framework/types';
import { DeviceProvider } from '../common/interfaces/DeviceProvider';
import { installDriver, startAppiumServer } from '../common/AppiumHelpers';
import { FullProject } from '@playwright/test';
import { remote } from 'webdriverio';

export default class EmulatorProvider implements DeviceProvider {
  sessionId?: string;
  private readonly project: FullProject<WebDriverConfig>;

  constructor(project: FullProject<WebDriverConfig>) {
    this.project = project;
  }

  async getDriver(): Promise<WebdriverIO.Browser> {
    return await this.createDriver();
  }

  async globalSetup() {
    // TODO: validate that the apk exists in path
    // throw new Error('Not implemented');
  }

  private async createDriver(): Promise<WebdriverIO.Browser> {
    await installDriver(
      this.project.use.platform === Platform.ANDROID
        ? 'uiautomator2'
        : 'xcuitest',
    );
    await startAppiumServer();
    const webDriverClient = await remote(await this.createConfig());
    return webDriverClient;
  }

  private async createConfig() {
    const platformName = this.project.use.platform;
    const udid = (this.project.use.device as EmulatorConfig).udid;
    const appPackageName = (this.project.use.device as EmulatorConfig)
      .packageName;
    const appLaunchableActivity = (this.project.use.device as EmulatorConfig)
      .launchableActivity;

    return {
      port: 4723,
      capabilities: {
        'appium:deviceName': this.project.use.device?.name,
        'appium:udid': udid,
        'appium:automationName':
          platformName === Platform.ANDROID ? 'uiautomator2' : 'xcuitest',
        'appium:platformVersion': (this.project.use.device as EmulatorConfig)
          .osVersion,
        'appium:appActivity': appLaunchableActivity,
        'appium:appPackage': appPackageName,
        platformName,
        'appium:autoGrantPermissions': true,
        'appium:app': this.project.use.buildPath,
        'appium:autoAcceptAlerts': true,
        'appium:fullReset': true,
        'appium:deviceOrientation': this.project.use.device?.orientation,
        'appium:settings[snapshotMaxDepth]': 62,
        'appium:wdaLaunchTimeout': 300_000,
      },
    };
  }
}
