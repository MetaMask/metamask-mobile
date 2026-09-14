import { Platform, ProviderName } from '../../../types.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { EmulatorConfigBuilder } from './EmulatorConfigBuilder.ts';

function createAndroidProject(): ProjectConfig {
  return {
    use: {
      platform: Platform.ANDROID,
      device: {
        provider: ProviderName.EMULATOR,
        name: 'appium_smoke_avd',
        udid: 'emulator-5554',
      },
      app: {
        packageName: 'io.metamask',
        launchableActivity: 'io.metamask.MainActivity',
      },
    },
  } as ProjectConfig;
}

describe('EmulatorConfigBuilder', () => {
  const portKeys = [
    'ANDROID_UIAUTOMATOR2_SYSTEM_PORT',
    'ANDROID_CHROMEDRIVER_PORT',
    'ANDROID_MJPEG_SERVER_PORT',
  ] as const;

  afterEach(() => {
    for (const key of portKeys) {
      delete process.env[key];
    }
  });

  it('omits explicit Android server ports outside pool mode', () => {
    const config = new EmulatorConfigBuilder(createAndroidProject()).build();

    expect(config.capabilities).not.toHaveProperty('appium:systemPort');
    expect(config.capabilities).not.toHaveProperty('appium:chromedriverPort');
    expect(config.capabilities).not.toHaveProperty('appium:mjpegServerPort');
  });

  it('pins Android server ports exported for the worker', () => {
    process.env.ANDROID_UIAUTOMATOR2_SYSTEM_PORT = '8201';
    process.env.ANDROID_CHROMEDRIVER_PORT = '9101';
    process.env.ANDROID_MJPEG_SERVER_PORT = '7811';

    const config = new EmulatorConfigBuilder(createAndroidProject()).build();

    expect(config.capabilities).toMatchObject({
      'appium:systemPort': 8201,
      'appium:chromedriverPort': 9101,
      'appium:mjpegServerPort': 7811,
    });
  });
});
