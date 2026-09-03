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

function createIosProject(): ProjectConfig {
  return {
    use: {
      platform: Platform.IOS,
      device: {
        provider: ProviderName.SIMULATOR,
        name: 'iPhone 16 Pro',
        udid: '11111111-1111-1111-1111-111111111111',
      },
      app: { appId: 'io.metamask.MetaMask' },
    },
  } as ProjectConfig;
}

describe('EmulatorConfigBuilder', () => {
  const portKeys = [
    'ANDROID_UIAUTOMATOR2_SYSTEM_PORT',
    'ANDROID_CHROMEDRIVER_PORT',
    'ANDROID_MJPEG_SERVER_PORT',
    'IOS_WDA_LOCAL_PORT',
    'IOS_MJPEG_SERVER_PORT',
  ] as const;
  const originalPortEnv = Object.fromEntries(
    portKeys.map((key) => [key, process.env[key]]),
  ) as Record<(typeof portKeys)[number], string | undefined>;

  afterEach(() => {
    for (const key of portKeys) {
      const originalValue = originalPortEnv[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
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

  it('omits iOS WDA ports outside pool mode', () => {
    const config = new EmulatorConfigBuilder(createIosProject()).build();

    expect(config.capabilities).not.toHaveProperty('appium:wdaLocalPort');
    expect(config.capabilities).not.toHaveProperty('appium:mjpegServerPort');
  });

  it('pins iOS WDA ports exported for the worker', () => {
    process.env.IOS_WDA_LOCAL_PORT = '8101';
    process.env.IOS_MJPEG_SERVER_PORT = '9101';

    const config = new EmulatorConfigBuilder(createIosProject()).build();

    expect(config.capabilities).toMatchObject({
      'appium:wdaLocalPort': 8101,
      'appium:mjpegServerPort': 9101,
    });
  });
});
