import AppiumUtilities, {
  executeMobileDeepLink,
  isOptionalElementVisible,
} from './AppiumUtilities';
import Utilities from './Utilities';
import type { AppiumElement } from './AppiumElement';
import type { CurrentDeviceDetails } from './fixtures/playwright';
import { setDeviceInfo } from './DeviceInfoCache.ts';

describe('AppiumUtilities.launchApp', () => {
  const executeMock = jest.fn();
  const terminateAppMock = jest.fn();
  // babel's transform-inline-environment-variables bakes process.env reads in at
  // compile time, so ANDROID_APK_PATH/IOS_APP_PATH cannot be set per-test — spy on
  // the artifact detection instead to pick the release vs debug launch path.
  let isReleaseArtifactSpy: jest.SpyInstance;

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
    process.env.CI = 'true';
    isReleaseArtifactSpy = jest
      .spyOn(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./Constants'),
        'isReleaseE2eArtifactForPlatform',
      )
      .mockReturnValue(true);
    executeMock.mockResolvedValue(undefined);
    terminateAppMock.mockResolvedValue(undefined);
    globalThis.driver = {
      execute: executeMock,
      terminateApp: terminateAppMock,
    } as unknown as WebdriverIO.Browser;
  });

  afterEach(() => {
    delete globalThis.driver;
    delete process.env.CI;
    isReleaseArtifactSpy.mockRestore();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('launches Android apps with Appium mobile startActivity intent parameters', async () => {
    const launchPromise = AppiumUtilities.launchApp(androidDevice, {
      launchArgs: {
        fixtureServerPort: '1234',
      },
    });

    await jest.advanceTimersByTimeAsync(2500);
    await launchPromise;

    expect(terminateAppMock).toHaveBeenCalledWith('io.metamask');
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
    const launchPromise = AppiumUtilities.launchApp(androidDevice, {
      launchArgs: {
        fixtureServerPort: '1234',
        stop: false,
        wait: false,
      },
    });

    await jest.advanceTimersByTimeAsync(2500);
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
    const launchPromise = AppiumUtilities.launchApp(iosDevice, {
      launchArgs: {
        fixtureServerPort: '5678',
        stop: false,
        wait: false,
      },
    });

    await jest.advanceTimersByTimeAsync(2500);
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

  it('launches local Android debug builds via Expo dev-client deep link', async () => {
    jest.useRealTimers();
    process.env.CI = 'false';
    isReleaseArtifactSpy.mockReturnValue(false);
    const execSyncMock = jest.spyOn(
      // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-nodejs-modules
      require('child_process'),
      'execSync',
    );
    execSyncMock.mockImplementation(() => Buffer.from(''));

    const fetchMock = jest.fn((url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/status')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('packager-status:running'),
        } as Response);
      }
      if (urlStr.includes('index.bundle')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('// metro bundle'),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`));
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await AppiumUtilities.launchApp(androidDevice);

      expect(execSyncMock).toHaveBeenCalledWith(
        'adb -s emulator-5554 reverse tcp:8081 tcp:8081',
        expect.objectContaining({ stdio: 'ignore' }),
      );
      expect(executeMock).toHaveBeenCalledWith(
        'mobile: startActivity',
        expect.objectContaining({
          component: 'io.metamask/io.metamask.MainActivity',
          action: 'android.intent.action.MAIN',
          categories: ['android.intent.category.LAUNCHER'],
        }),
      );
      expect(executeMock).toHaveBeenCalledWith(
        'mobile: deepLink',
        expect.objectContaining({
          package: 'io.metamask',
          url: expect.stringContaining(
            'expo-metamask://expo-development-client',
          ),
        }),
      );
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
      execSyncMock.mockRestore();
      jest.useFakeTimers();
    }
  }, 10_000);
});

describe('executeMobileDeepLink', () => {
  const executeMock = jest.fn();

  beforeEach(() => {
    executeMock.mockResolvedValue(undefined);
    setDeviceInfo('android', { width: 1080, height: 2340 });
    globalThis.driver = {
      execute: executeMock,
      capabilities: {
        'appium:appPackage': 'io.metamask',
      },
    } as unknown as WebdriverIO.Browser;
  });

  afterEach(() => {
    delete globalThis.driver;
    jest.clearAllMocks();
  });

  it('scopes Android deep links to the session app package', async () => {
    await executeMobileDeepLink(
      'dapp://metamask.github.io/snaps/test-snaps/3.4.2/',
    );

    expect(executeMock).toHaveBeenCalledWith('mobile: deepLink', {
      url: 'dapp://metamask.github.io/snaps/test-snaps/3.4.2/',
      package: 'io.metamask',
    });
  });

  it('falls back to unprefixed appPackage in session capabilities', async () => {
    globalThis.driver = {
      execute: executeMock,
      capabilities: {
        platformName: 'Android',
        appPackage: 'io.metamask',
      },
    } as unknown as WebdriverIO.Browser;

    await executeMobileDeepLink('dapp://example.com');

    expect(executeMock).toHaveBeenCalledWith('mobile: deepLink', {
      url: 'dapp://example.com',
      package: 'io.metamask',
    });
  });

  it('uses an explicit package when provided', async () => {
    globalThis.driver = {
      execute: executeMock,
      capabilities: {},
    } as unknown as WebdriverIO.Browser;

    await executeMobileDeepLink('dapp://example.com', {
      package: 'io.metamask',
    });

    expect(executeMock).toHaveBeenCalledWith('mobile: deepLink', {
      url: 'dapp://example.com',
      package: 'io.metamask',
    });
  });

  it('omits package on iOS deep links', async () => {
    setDeviceInfo('ios', { width: 390, height: 844 });
    await executeMobileDeepLink('dapp://example.com');

    expect(executeMock).toHaveBeenCalledWith('mobile: deepLink', {
      url: 'dapp://example.com',
    });
  });
});

describe('AppiumUtilities.resolveDeviceAccount', () => {
  it.each([
    ['Google Pixel 8 Pro', 'Account 1'],
    ['Pixel 8 Pro', 'Account 1'],
    ['pixel 8 pro', 'Account 1'],
    ['iPhone 16 Pro Max', 'Account 4'],
    ['iPhone 12', 'Account 5'],
  ])('maps the device %s to %s', (deviceName, expected) => {
    const result = AppiumUtilities.resolveDeviceAccount(deviceName);

    expect(result).toBe(expected);
  });

  it('returns undefined for a device that is not in the matrix', () => {
    const result = AppiumUtilities.resolveDeviceAccount('Nokia 3310');

    expect(result).toBeUndefined();
  });

  it('does not match a device by a partial name', () => {
    const result = AppiumUtilities.resolveDeviceAccount('Pixel 8');

    expect(result).toBeUndefined();
  });
});

describe('isOptionalElementVisible', () => {
  const setTimeoutMock = jest.fn();
  const fakeElement = {} as AppiumElement;
  let isVisibleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    setTimeoutMock.mockReset().mockResolvedValue(undefined);
    isVisibleSpy = jest
      .spyOn(Utilities, 'isElementVisible')
      .mockResolvedValue(false);
    globalThis.driver = {
      setTimeout: setTimeoutMock,
    } as unknown as WebdriverIO.Browser;
  });

  afterEach(() => {
    delete globalThis.driver;
    isVisibleSpy.mockRestore();
    jest.useRealTimers();
  });

  it('creates the locator under a short implicit wait and restores the default', async () => {
    const locator = jest.fn(async () => {
      expect(setTimeoutMock).toHaveBeenCalledTimes(1);
      expect(setTimeoutMock).toHaveBeenLastCalledWith({ implicit: 300 });
      return fakeElement;
    });

    await isOptionalElementVisible(locator);

    expect(locator).toHaveBeenCalledTimes(1);
    expect(setTimeoutMock).toHaveBeenCalledTimes(2);
    expect(setTimeoutMock).toHaveBeenLastCalledWith({ implicit: 3500 });
  });

  it('returns true when the element becomes visible', async () => {
    isVisibleSpy.mockResolvedValue(true);

    const result = await isOptionalElementVisible(async () => fakeElement);

    expect(result).toBe(true);
  });

  it('returns false when the element is absent', async () => {
    isVisibleSpy.mockResolvedValue(false);

    const result = await isOptionalElementVisible(async () => fakeElement);

    expect(result).toBe(false);
  });

  it('polls with what is left of the budget after the lookups', async () => {
    const locator = async () => {
      jest.advanceTimersByTime(600);
      return fakeElement;
    };

    await isOptionalElementVisible(locator, 2000);

    // 2000 budget - 600 lookups - 300 reserved for restoring the implicit wait
    expect(isVisibleSpy).toHaveBeenCalledWith(expect.anything(), 1100);
  });

  it('still gives an element that is already there 300ms to be seen when the lookups used the whole budget', async () => {
    const locator = async () => {
      jest.advanceTimersByTime(5000);
      return fakeElement;
    };

    await isOptionalElementVisible(locator, 2000);

    expect(isVisibleSpy).toHaveBeenCalledWith(expect.anything(), 300);
  });

  it('restores the default implicit wait and rethrows when the locator fails', async () => {
    const locator = async (): Promise<AppiumElement> => {
      throw new Error('lookup failed');
    };

    const result = isOptionalElementVisible(locator);

    await expect(result).rejects.toThrow('lookup failed');
    expect(setTimeoutMock).toHaveBeenLastCalledWith({ implicit: 3500 });
  });
});
