import { WebDriverConfig, Platform , EmulatorConfig } from '../../../e2e/framework/types';
import { createLogger } from '../../../e2e/framework/logger';
import { DeviceProvider } from '../common/interfaces/DeviceProvider';
import WebDriver, { Client } from 'webdriver';
import { installDriver, startAppiumServer } from '../common/AppiumHelpers';
import { FullProject } from '@playwright/test';

const logger = createLogger({
  name: 'EmulatorProvider',
});

export default class EmulatorProvider implements DeviceProvider {
  sessionId?: string;
  private readonly project: FullProject<WebDriverConfig>;

  constructor(
    project: FullProject<WebDriverConfig>,
    appBundleId: string | undefined,
  ) {
    this.project = project;
    if (appBundleId) {
      logger.debug(
        `Bundle id is specified (${appBundleId}) but ignored for Emulator provider.`,
      );
    }
  }

  async getDriver(): Promise<Client> {
    return await this.createDriver();
  }

  async globalSetup() {
    // TODO: validate that the apk exists in path
    // throw new Error('Not implemented');
  }

  private async createDriver(): Promise<Client> {
    await installDriver(
      this.project.use.platform === Platform.ANDROID
        ? 'uiautomator2'
        : 'xcuitest',
    );
    await startAppiumServer();
    const webDriverClient = await WebDriver.newSession(
      await this.createConfig(),
    );
    this.sessionId = webDriverClient.sessionId;
    // TODO REMOVE THIS: webDriverClient.findElement('xpath', '//*[@text="Hello World"]');
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
