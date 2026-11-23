import type { TestInfo } from '@playwright/test';
import {
  __resetAppProfilingCollectorForTests,
  collectAppProfiling,
  enableHermesAppProfiling,
  isHermesCpuProfileCollectionEnabled,
  skipHermesCollectionUntilRestart,
} from './appProfiling.ts';

const mockExecuteMobileDeepLink = jest.fn();
const mockGetDriver = jest.fn();

jest.mock('../../framework/AppiumUtilities.ts', () => ({
  executeMobileDeepLink: (...args: unknown[]) =>
    mockExecuteMobileDeepLink(...args),
  getDriver: () => mockGetDriver(),
}));

const mockBackgroundApp = jest.fn();

jest.mock('../../framework/AppiumGestures.ts', () => ({
  __esModule: true,
  default: {
    backgroundApp: (...args: unknown[]) => mockBackgroundApp(...args),
  },
}));

jest.mock('fs/promises', () => ({
  __esModule: true,
  default: {
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async () => undefined),
  },
}));

describe('isHermesCpuProfileCollectionEnabled', () => {
  // Bracket access — babel transform-inline-environment-variables must not
  // bake these reads/writes or afterEach cleanup becomes `delete undefined`.
  const envKey = 'COLLECT_HERMES_CPUPROFILES';
  const previous = process.env[envKey];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is unset', () => {
    delete process.env[envKey];

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is false', () => {
    process.env[envKey] = 'false';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns false when COLLECT_HERMES_CPUPROFILES is 1', () => {
    process.env[envKey] = '1';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(false);
  });

  it('returns true only when COLLECT_HERMES_CPUPROFILES is true', () => {
    process.env[envKey] = 'true';

    expect(isHermesCpuProfileCollectionEnabled()).toBe(true);
  });
});

describe('collectAppProfiling', () => {
  const envKey = 'COLLECT_HERMES_CPUPROFILES';
  const previous = process.env[envKey];

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  it('returns 0 without pulling when Hermes collection is disabled', async () => {
    delete process.env[envKey];
    const testInfo = { title: 'example' } as TestInfo;

    const collected = await collectAppProfiling(testInfo, 'android');

    expect(collected).toBe(0);
  });

  it('restores the app after backgrounding and saves the triggered segment', async () => {
    process.env[envKey] = 'true';
    __resetAppProfilingCollectorForTests();
    mockBackgroundApp.mockReset();
    let backgrounded = false;
    mockBackgroundApp.mockImplementation(async () => {
      backgrounded = true;
    });
    const profile = Buffer.from('{"samples":[1]}', 'utf8').toString('base64');
    const pullFile = jest.fn(async (remotePath: string) => {
      if (backgrounded && remotePath.endsWith('segment-1.cpuprofile')) {
        return profile;
      }
      throw new Error('not found');
    });
    mockGetDriver.mockReturnValue({
      capabilities: {
        platformName: 'Android',
        'appium:appPackage': 'io.metamask',
      },
      pullFile,
    });
    const attach = jest.fn();
    const testInfo = {
      title: 'swap',
      retry: 0,
      project: { name: 'testmu-android' },
      attach,
    } as unknown as TestInfo;

    const collected = await collectAppProfiling(testInfo, 'android', {
      segmentWaitTimeoutMs: 0,
    });

    expect(collected).toBe(1);
    expect(mockBackgroundApp).toHaveBeenCalledWith(3);
    expect(attach).toHaveBeenCalledWith(
      'testmu-android-swap.cpuprofile',
      expect.objectContaining({ contentType: 'application/json' }),
    );
  });
});

describe('enableHermesAppProfiling', () => {
  const envKey = 'COLLECT_HERMES_CPUPROFILES';
  const previous = process.env[envKey];

  beforeEach(() => {
    mockExecuteMobileDeepLink.mockReset();
    mockGetDriver.mockReset();
    __resetAppProfilingCollectorForTests();
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  function androidDriver(pullFile: jest.Mock) {
    mockGetDriver.mockReturnValue({
      capabilities: {
        platformName: 'Android',
        'appium:appPackage': 'io.metamask',
      },
      pullFile,
    });
  }

  it('does not open a deeplink when collection is disabled', async () => {
    delete process.env[envKey];

    await enableHermesAppProfiling();

    expect(mockExecuteMobileDeepLink).not.toHaveBeenCalled();
  });

  it('does not open a deeplink on iOS', async () => {
    process.env[envKey] = 'true';
    mockGetDriver.mockReturnValue({
      capabilities: { platformName: 'iOS' },
    });

    await enableHermesAppProfiling();

    expect(mockExecuteMobileDeepLink).not.toHaveBeenCalled();
  });

  it('arms the current process and ignores setup segments named in the marker', async () => {
    process.env[envKey] = 'true';
    let armedUrl = '';
    mockExecuteMobileDeepLink.mockImplementation(async (url: string) => {
      armedUrl = url;
    });
    const pullFile = jest.fn(async () => {
      const nonce = new URL(armedUrl).searchParams.get('nonce');
      return Buffer.from(`${nonce}\n2\n`, 'utf8').toString('base64');
    });
    androidDriver(pullFile);

    await enableHermesAppProfiling({ markerPollIntervalMs: 0 });

    expect(armedUrl).toContain('metamask://e2e/profiler/arm');
    expect(pullFile).toHaveBeenCalledWith(
      '/sdcard/Android/data/io.metamask/files/Documents/metamask-performance.armed',
    );
  });

  it('skips the next collection until the app restarts', async () => {
    process.env[envKey] = 'true';
    androidDriver(
      jest.fn(async () => {
        throw new Error('not found');
      }),
    );

    await skipHermesCollectionUntilRestart();
    const collected = await collectAppProfiling(
      { title: 'cold start' } as TestInfo,
      'android',
    );

    expect(mockExecuteMobileDeepLink).not.toHaveBeenCalled();
    expect(collected).toBe(0);
    expect(mockGetDriver).toHaveBeenCalledTimes(1);
  });

  it('fails when the app does not confirm the arm', async () => {
    process.env[envKey] = 'true';
    mockExecuteMobileDeepLink.mockResolvedValue(undefined);
    androidDriver(
      jest.fn(async () => {
        throw new Error('not found');
      }),
    );

    await expect(
      enableHermesAppProfiling({
        markerTimeoutMs: 1,
        markerPollIntervalMs: 0,
      }),
    ).rejects.toThrow('Hermes profiling was not armed');
  });
});
