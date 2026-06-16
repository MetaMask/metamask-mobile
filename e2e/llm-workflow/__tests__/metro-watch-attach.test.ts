/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import { IOSLaunchError } from '../launcher-types';
import {
  attachToMetroWatchMode,
  buildMetroDeepLink,
} from '../ios/metro-watch-attach';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));

const mockExecFileSync = execFileSync as jest.MockedFunction<
  typeof execFileSync
>;

describe('metro-watch-attach', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let stderrSpy: jest.SpyInstance;
  let abortTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    abortTimeoutSpy = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(new AbortController().signal);
    mockFetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    mockExecFileSync.mockReturnValue(Buffer.from(''));
  });

  afterEach(() => {
    abortTimeoutSpy.mockRestore();
    stderrSpy.mockRestore();
    jest.useRealTimers();
  });

  it('builds correct deep-link URL via buildMetroDeepLink', () => {
    const result = buildMetroDeepLink(8081);

    expect(result.bundleUrl).toBe(
      'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false&disableOnboarding=1',
    );
    expect(result.deepLinkUrl).toBe(
      `expo-metamask://expo-development-client/?url=${encodeURIComponent(
        result.bundleUrl,
      )}`,
    );
  });

  it('calls xcrun simctl openurl with the deep link URL', async () => {
    const { deepLinkUrl } = buildMetroDeepLink(8081);

    await attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      stabilizationDelayMs: 0,
      fetchImpl: mockFetch,
    });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'openurl', 'SIM-UDID', deepLinkUrl],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 },
    );
  });

  it('returns successfully when Metro responds 200 within timeout', async () => {
    await expect(
      attachToMetroWatchMode({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        stabilizationDelayMs: 0,
        fetchImpl: mockFetch,
      }),
    ).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false&disableOnboarding=1',
      { signal: expect.any(AbortSignal) },
    );
  });

  it('throws IOSLaunchError when openurl fails', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('openurl failed');
    });

    await expect(
      attachToMetroWatchMode({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        retryDelayMs: 1,
        stabilizationDelayMs: 0,
        fetchImpl: mockFetch,
      }),
    ).rejects.toMatchObject({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: expect.stringContaining('Failed to open Metro deep link'),
    } satisfies Partial<IOSLaunchError>);

    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
  });

  it('retries when fetch fails, eventually succeeds', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'));
    mockFetch.mockResolvedValueOnce({ ok: true } as Response);

    await attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      retryDelayMs: 1,
      stabilizationDelayMs: 0,
      metroReadyTimeoutMs: 1_000,
      fetchImpl: mockFetch,
    });

    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('throws IOSLaunchError after maxAttempts', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('openurl failed');
    });

    await expect(
      attachToMetroWatchMode({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        maxAttempts: 2,
        retryDelayMs: 0,
        fetchImpl: mockFetch,
      }),
    ).rejects.toMatchObject({
      code: 'MM_IOS_RUNNER_NOT_READY',
      remediation: expect.stringContaining('Ensure the simulator is booted'),
    } satisfies Partial<IOSLaunchError>);
  });

  it('sleeps stabilizationDelayMs after Metro is ready', async () => {
    const setTimeoutSpy = jest
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((callback: TimerHandler) => {
        if (typeof callback === 'function') {
          callback();
        }
        return 0 as unknown as NodeJS.Timeout;
      });

    try {
      await attachToMetroWatchMode({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        stabilizationDelayMs: 750,
        fetchImpl: mockFetch,
      });

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 750);
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });
});
