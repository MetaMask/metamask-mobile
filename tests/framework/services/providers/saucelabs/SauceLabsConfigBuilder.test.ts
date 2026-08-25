import { ProviderName, Platform } from '../../../types.ts';
import { SauceLabsConfigBuilder } from './SauceLabsConfigBuilder.ts';
import {
  DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
  DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
} from '../../../Constants.ts';

describe('SauceLabsConfigBuilder', () => {
  const originalUsername = process.env.SAUCE_USERNAME;
  const originalAccessKey = process.env.SAUCE_ACCESS_KEY;

  afterEach(() => {
    if (originalUsername === undefined) delete process.env.SAUCE_USERNAME;
    else process.env.SAUCE_USERNAME = originalUsername;
    if (originalAccessKey === undefined) delete process.env.SAUCE_ACCESS_KEY;
    else process.env.SAUCE_ACCESS_KEY = originalAccessKey;
  });

  it('builds an Android config without an OS version', () => {
    process.env.SAUCE_USERNAME = 'user';
    process.env.SAUCE_ACCESS_KEY = 'key';

    const config = new SauceLabsConfigBuilder({
      use: {
        platform: Platform.ANDROID,
        device: {
          provider: ProviderName.SAUCELABS,
          name: 'Google_Pixel_7_POC49',
        },
        app: {
          packageName: 'io.metamask',
          launchableActivity: 'io.metamask.MainActivity',
          buildPath: 'storage:filename=app.apk',
        },
      },
    } as never).build();

    expect(config.hostname).toBe('ondemand.eu-central-1.saucelabs.com');
    expect(config.capabilities['appium:deviceName']).toBe(
      'Google_Pixel_7_POC49',
    );
    expect(config.capabilities).not.toHaveProperty('appium:platformVersion');
    expect(config.capabilities['appium:newCommandTimeout']).toBe(
      DEFAULT_BROWSERSTACK_NEW_COMMAND_TIMEOUT_SECONDS,
    );
    expect(config.capabilities['appium:appPackage']).toBe('io.metamask');
    expect(config.capabilities['appium:appActivity']).toBe(
      'io.metamask.MainActivity',
    );
    expect(config.capabilities['appium:disableIdLocatorAutocompletion']).toBe(
      true,
    );
    expect(
      config.capabilities['appium:settings[waitForIdleTimeout]'],
    ).toBe(0);
    expect(
      config.capabilities['appium:settings[snapshotMaxDepth]'],
    ).toBe(62);
    expect(
      config.capabilities['appium:settings[actionAcknowledgmentTimeout]'],
    ).toBe(3000);
    expect(
      config.capabilities['appium:settings[ignoreUnimportantViews]'],
    ).toBe(true);
    expect(config.capabilities['appium:disableWindowAnimation']).toBe(true);
    expect(config.capabilities['appium:skipDeviceInitialization']).toBe(true);
    expect(config.capabilities['sauce:options']).toMatchObject({
      app: 'storage:filename=app.apk',
      appiumVersion: 'latest',
      idleTimeout: DEFAULT_BROWSERSTACK_IDLE_TIMEOUT_SECONDS,
      capturePerformance: true,
      privateDevicesOnly: true,
    });
  });
});
