import type { TestInfo } from '@playwright/test';
import {
  __resetAppProfilingCollectorForTests,
  collectAppProfiling,
  enableHermesAppProfiling,
  isHermesCpuProfileCollectionEnabled,
} from './appProfiling.ts';

const mockExecuteMobileDeepLink = jest.fn();
const mockGetDriver = jest.fn();

jest.mock('../../framework/AppiumUtilities.ts', () => ({
  executeMobileDeepLink: (...args: unknown[]) =>
    mockExecuteMobileDeepLink(...args),
  getDriver: () => mockGetDriver(),
}));

jest.mock('../../framework/AppiumGestures.ts', () => ({
  __esModule: true,
  default: {
    backgroundApp: jest.fn(),
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
    expect(armedUrl).toContain('scope=now');
    expect(pullFile).toHaveBeenCalledWith(
      '/sdcard/Android/data/io.metamask/files/Documents/metamask-performance.armed',
    );
  });

  it('skips the next collection when arming the relaunched process', async () => {
    process.env[envKey] = 'true';
    let armedUrl = '';
    mockExecuteMobileDeepLink.mockImplementation(async (url: string) => {
      armedUrl = url;
    });
    androidDriver(
      jest.fn(async () => {
        const nonce = new URL(armedUrl).searchParams.get('nonce');
        return Buffer.from(`${nonce}\n0\n`, 'utf8').toString('base64');
      }),
    );

    await enableHermesAppProfiling({
      scope: 'next-process',
      markerPollIntervalMs: 0,
    });

    expect(armedUrl).toContain('scope=next-process');
    const collected = await collectAppProfiling(
      { title: 'cold start' } as TestInfo,
      'android',
    );
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
