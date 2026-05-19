import PlaywrightUtilities from './PlaywrightUtilities';
import type { CurrentDeviceDetails } from './fixture';

describe('PlaywrightUtilities.launchApp', () => {
  const executeMock = jest.fn();
  const terminateAppMock = jest.fn();

  const androidDevice: CurrentDeviceDetails = {
    platform: 'android',
    deviceName: 'Pixel_5',
    udid: 'emulator-5554',
    packageName: 'io.metamask',
    launchableActivity: 'io.metamask.MainActivity',
    isBrowserstack: false,
  };

  const iosDevice: CurrentDeviceDetails = {
    platform: 'ios',
    deviceName: 'iPhone 15',
    appId: 'io.metamask',
    isBrowserstack: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    executeMock.mockResolvedValue(undefined);
    terminateAppMock.mockResolvedValue(undefined);
    globalThis.driver = {
      execute: executeMock,
      terminateApp: terminateAppMock,
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

  it('does not pass Appium stop/wait control flags as Android intent extras', async () => {
    const launchPromise = PlaywrightUtilities.launchApp(androidDevice, {
      launchArgs: {
        fixtureServerPort: '1234',
        stop: false,
        wait: false,
      },
    });

    await jest.advanceTimersByTimeAsync(1000);
    await launchPromise;

    const startActivityCall = executeMock.mock.calls.find(
      ([command]) => command === 'mobile: startActivity',
    );
    expect(startActivityCall).toBeDefined();
    const payload = startActivityCall?.[1] as {
      stop: boolean;
      wait: boolean;
      extras?: [string, string, string][];
    };

    expect(payload.stop).toBe(false);
    expect(payload.wait).toBe(false);
    expect(payload.extras ?? []).not.toEqual(
      expect.arrayContaining([
        ['s', 'stop', 'false'],
        ['s', 'wait', 'false'],
      ]),
    );
    expect(payload.extras).toEqual(
      expect.arrayContaining([['s', 'fixtureServerPort', '1234']]),
    );
  });

  it('does not pass Appium stop/wait control flags as iOS process arguments', async () => {
    const launchPromise = PlaywrightUtilities.launchApp(iosDevice, {
      launchArgs: {
        fixtureServerPort: '5678',
        stop: false,
        wait: false,
      },
    });

    await jest.advanceTimersByTimeAsync(1000);
    await launchPromise;

    expect(terminateAppMock).toHaveBeenCalledWith('io.metamask');
    expect(executeMock).toHaveBeenCalledWith(
      'mobile: launchApp',
      expect.objectContaining({
        bundleId: 'io.metamask',
        arguments: expect.arrayContaining(['-fixtureServerPort', '5678']),
      }),
    );

    const launchAppCall = executeMock.mock.calls.find(
      ([command]) => command === 'mobile: launchApp',
    );
    const { arguments: processArguments = [] } = (launchAppCall?.[1] ?? {}) as {
      arguments?: string[];
    };

    expect(processArguments).not.toEqual(
      expect.arrayContaining(['-stop', 'false', '-wait', 'false']),
    );
  });
});
