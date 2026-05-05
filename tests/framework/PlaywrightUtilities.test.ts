import PlaywrightUtilities from './PlaywrightUtilities';
import type { CurrentDeviceDetails } from './fixture';

describe('PlaywrightUtilities.launchApp', () => {
  const executeMock = jest.fn();

  const androidDevice: CurrentDeviceDetails = {
    platform: 'android',
    deviceName: 'Pixel_5',
    udid: 'emulator-5554',
    packageName: 'io.metamask',
    launchableActivity: 'io.metamask.MainActivity',
    isBrowserstack: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    executeMock.mockResolvedValue(undefined);
    globalThis.driver = {
      execute: executeMock,
    } as unknown as WebdriverIO.Browser;
  });

  afterEach(() => {
    delete globalThis.driver;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('launches Android apps with Appium mobile startActivity intent parameters', async () => {
    const launchPromise = PlaywrightUtilities.launchApp(androidDevice, {
      launchArgs: {
        fixtureServerPort: '1234',
      },
    });

    await jest.advanceTimersByTimeAsync(1000);
    await launchPromise;

    expect(executeMock).toHaveBeenCalledWith(
      'mobile: startActivity',
      expect.objectContaining({
        component: 'io.metamask/io.metamask.MainActivity',
        action: 'android.intent.action.MAIN',
        categories: ['android.intent.category.LAUNCHER'],
        stop: true,
        wait: true,
        extras: expect.arrayContaining([['s', 'fixtureServerPort', '1234']]),
      }),
    );
    expect(executeMock).not.toHaveBeenCalledWith(
      'mobile: startActivity',
      expect.objectContaining({
        appPackage: expect.any(String),
      }),
    );
    expect(executeMock).not.toHaveBeenCalledWith(
      'mobile: startActivity',
      expect.objectContaining({
        appActivity: expect.any(String),
      }),
    );
    expect(executeMock).not.toHaveBeenCalledWith(
      'mobile: startActivity',
      expect.objectContaining({
        optionalIntentArguments: expect.any(String),
      }),
    );
  });
});
