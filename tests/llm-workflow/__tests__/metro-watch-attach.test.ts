/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import { IOSLaunchError } from '../launcher-types';
import {
  attachToMetroWatchMode,
  buildMetroDeepLink,
  type AttachToMetroResult,
} from '../ios/metro-watch-attach';
import {
  probeHermesHealthy,
  verifyJsLiveness,
  type ProbeHermesHealthyResult,
} from '../ios/hermes-health';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('../ios/hermes-health', () => ({
  probeHermesHealthy: jest.fn(),
  verifyJsLiveness: jest.fn(),
}));

const mockExecFileSync = jest.mocked(execFileSync);
const mockProbeHermesHealthy = jest.mocked(probeHermesHealthy);
const mockVerifyJsLiveness = jest.mocked(verifyJsLiveness);

describe('metro-watch-attach', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let stderrSpy: jest.SpyInstance;
  let abortTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    abortTimeoutSpy = jest
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(new AbortController().signal);
    mockFetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    mockProbeHermesHealthy.mockResolvedValue({
      healthy: true,
      target: {
        id: 'target-1',
        title: 'Hermes React Native',
        appId: 'io.metamask.MetaMask',
        webSocketDebuggerUrl: 'ws://localhost:8081/inspector/page/1',
        reactNative: { logicalDeviceId: 'SIM-UDID' },
      },
      pinnedDeviceId: 'SIM-UDID',
    } as ProbeHermesHealthyResult);
    mockVerifyJsLiveness.mockResolvedValue(true);
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

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });

    await jest.advanceTimersByTimeAsync(100);
    await promise;

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'openurl', 'SIM-UDID', deepLinkUrl],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000 },
    );
  });

  it('polls /status instead of /index.bundle to avoid concurrent bundle requests', async () => {
    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });

    await jest.advanceTimersByTimeAsync(100);
    await promise;

    expect(mockFetch).toHaveBeenCalledWith('http://localhost:8081/status', {
      signal: expect.any(AbortSignal),
    });
  });

  it('probes Hermes health and verifies JS liveness after Metro is ready', async () => {
    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });

    await jest.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(mockProbeHermesHealthy).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 8081,
        appId: 'io.metamask.MetaMask',
      }),
    );
    expect(mockVerifyJsLiveness).toHaveBeenCalledWith(
      'ws://localhost:8081/inspector/page/1',
      expect.any(Number),
    );
    expect(result).toEqual<AttachToMetroResult>({ pinnedDeviceId: 'SIM-UDID' });
  });

  it('throws IOSLaunchError when openurl fails', async () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('openurl failed');
    });

    await expect(
      attachToMetroWatchMode({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        appBundleId: 'io.metamask.MetaMask',
        retryDelayMs: 1,
        fetchImpl: mockFetch,
      }),
    ).rejects.toMatchObject({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: expect.stringContaining('Failed to open Metro deep link'),
    } satisfies Partial<IOSLaunchError>);

    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
  });

  it('retries when fetch fails, eventually succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({ ok: true } as Response);

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      metroReadyTimeoutMs: 1_000,
      fetchImpl: mockFetch,
    });

    await jest.advanceTimersByTimeAsync(1_500);
    await promise;

    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('throws IOSLaunchError after maxAttempts', async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      maxAttempts: 2,
      metroReadyTimeoutMs: 1,
      fetchImpl: mockFetch,
    });

    await Promise.all([
      jest.advanceTimersByTimeAsync(2_000),
      expect(promise).rejects.toMatchObject({
        code: 'MM_INVALID_CONFIG',
        message: expect.stringContaining('attach failed after 2 attempts'),
        remediation: expect.stringContaining('yarn watch:clean'),
      } satisfies Partial<IOSLaunchError>),
    ]);
  });

  it('throws MM_LAUNCH_FAILED when Hermes target is not found (release build)', async () => {
    mockProbeHermesHealthy.mockResolvedValue({
      healthy: false,
      reason: 'HERMES_TARGET_NOT_FOUND',
    } as ProbeHermesHealthyResult);

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });
    const assertion = await expect(promise).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('Hermes health check failed'),
      remediation: expect.stringContaining('dev build'),
    } satisfies Partial<IOSLaunchError>);

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('throws MM_LAUNCH_FAILED when Hermes target is ambiguous', async () => {
    mockProbeHermesHealthy.mockResolvedValue({
      healthy: false,
      reason: 'HERMES_MULTIPLE_DEVICES',
    } as ProbeHermesHealthyResult);

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });
    const assertion = await expect(promise).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('HERMES_MULTIPLE_DEVICES'),
    } satisfies Partial<IOSLaunchError>);

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('proceeds with target-presence-only when JS liveness returns false', async () => {
    mockVerifyJsLiveness.mockResolvedValue(false);

    const promise = attachToMetroWatchMode({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
      fetchImpl: mockFetch,
    });

    await jest.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toEqual<AttachToMetroResult>({ pinnedDeviceId: 'SIM-UDID' });
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('JS liveness probe failed'),
    );
  });
});
