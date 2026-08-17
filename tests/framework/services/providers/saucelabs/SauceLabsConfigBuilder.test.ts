import { ProviderName, Platform } from '../../../types.ts';
import { SauceLabsConfigBuilder } from './SauceLabsConfigBuilder.ts';

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

    expect(config.hostname).toBe('ondemand.us-west-1.saucelabs.com');
    expect(config.capabilities['appium:deviceName']).toBe(
      'Google_Pixel_7_POC49',
    );
    expect(config.capabilities).not.toHaveProperty('appium:platformVersion');
    expect(config.capabilities['sauce:options']).toMatchObject({
      app: 'storage:filename=app.apk',
      capturePerformance: true,
    });
  });
});
