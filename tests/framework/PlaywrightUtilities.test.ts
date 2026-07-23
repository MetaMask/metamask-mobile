import PlaywrightUtilities, {
  executeMobileDeepLink,
} from './PlaywrightUtilities';
import type { CurrentDeviceDetails } from './fixtures/playwright';
import { setDeviceInfo } from './DeviceInfoCache.ts';

describe('PlaywrightUtilities.launchApp', () => {
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
    const launchPromise = PlaywrightUtilities.launchApp(androidDevice, {
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
    const launchPromise = PlaywrightUtilities.launchApp(androidDevice, {
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
    const launchPromise = PlaywrightUtilities.launchApp(iosDevice, {
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
      await PlaywrightUtilities.launchApp(androidDevice);

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
