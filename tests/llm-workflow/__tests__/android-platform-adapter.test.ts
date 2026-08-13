import type {
  ExtensionState,
  MobilePlatformDriver,
} from '@metamask/client-mcp-core';
import type { DeviceBackend } from '@metamask/device-mcp';

import { runDeviceAdb } from '../android/adb';
import {
  disableAndroidAnimations,
  restoreAndroidAnimations,
} from '../android/animations';
import {
  cleanupAndroidMetro,
  openAndroidMetroDeepLink,
  prepareAndroidMetro,
} from '../android/metro-watch-attach';
import {
  AndroidPlatformAdapter,
  isAdbBackend,
} from '../android/platform-adapter';
import {
  assertNoDeviceSessionOverride,
  validateAndroidPrerequisites,
} from '../android/prerequisites';

jest.mock('../android/adb', () => ({ runDeviceAdb: jest.fn() }));
jest.mock('../android/animations', () => ({
  disableAndroidAnimations: jest.fn(),
  restoreAndroidAnimations: jest.fn(),
}));
jest.mock('../android/prerequisites', () => ({
  ANDROID_APP_ID: 'io.metamask',
  assertNoDeviceSessionOverride: jest.fn(),
  normalizeAndroidComponent: jest.requireActual('../android/prerequisites')
    .normalizeAndroidComponent,
  validateAndroidPrerequisites: jest.fn(),
}));
jest.mock('../android/metro-watch-attach', () => ({
  prepareAndroidMetro: jest.fn(),
  openAndroidMetroDeepLink: jest.fn(),
  cleanupAndroidMetro: jest.fn(),
}));
jest.mock('../android/snapshot-backend', () => ({
  wrapAndroidSnapshotBackend: jest.fn((backend: DeviceBackend) => backend),
}));

const mockValidate = jest.mocked(validateAndroidPrerequisites);
const resumedActivity =
  'mResumedActivity: ActivityRecord{abc u0 io.metamask/io.metamask.MainActivity t1}';

const loadedState: ExtensionState = {
  isLoaded: true,
  currentUrl: '',
  extensionId: 'io.metamask',
  isUnlocked: true,
  currentScreen: 'unknown',
  accountAddress: null,
  networkName: null,
  chainId: null,
  balance: null,
};

describe('AndroidPlatformAdapter', () => {
  let backend: DeviceBackend;
  let mobileDriver: Pick<
    MobilePlatformDriver,
    'getAppState' | 'getTestIds' | 'hermesTargets'
  >;
  let createBackend: jest.Mock;
  let createDriver: jest.Mock;
  let runReadinessAdb: jest.Mock;
  let now: jest.Mock;
  let clock: number;

  beforeEach(() => {
    jest.clearAllMocks();
    clock = 0;
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
    });
    backend = {
      kind: 'adb',
      platform: 'android',
      openApp: jest.fn().mockResolvedValue(undefined),
      closeApp: jest.fn().mockResolvedValue(undefined),
    } as unknown as DeviceBackend;
    mobileDriver = {
      getAppState: jest.fn().mockResolvedValue(loadedState),
      getTestIds: jest
        .fn()
        .mockResolvedValue([
          { testId: 'login', text: '', tag: 'View', visible: true },
        ]),
      hermesTargets: jest.fn().mockResolvedValue({
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'target-1', logicalDeviceId: 'metro-device-a' },
      }),
    };
    createBackend = jest.fn().mockResolvedValue(backend);
    createDriver = jest.fn().mockReturnValue(mobileDriver);
    runReadinessAdb = jest.fn().mockReturnValue(resumedActivity);
    now = jest.fn(() => clock);
    jest.mocked(disableAndroidAnimations).mockReturnValue({
      serial: 'emulator-5554',
      previous: new Map([['animator_duration_scale', '1']]),
    });
    jest.mocked(prepareAndroidMetro).mockResolvedValue({
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    });
    jest
      .mocked(openAndroidMetroDeepLink)
      .mockImplementation((_attachment, beforeOpen) => beforeOpen?.());
  });

  function createAdapter(expectedAdbBackend = true): AndroidPlatformAdapter {
    return new AndroidPlatformAdapter({
      createBackend,
      createDriver,
      isAdbBackend: jest.fn().mockReturnValue(expectedAdbBackend),
      wrapBackend: (rawBackend) => rawBackend,
      runDeviceAdb: runReadinessAdb,
      now,
      delay: jest.fn(async (milliseconds: number) => {
        clock += milliseconds;
      }),
      readinessTimeoutMs: 10,
      readinessIntervalMs: 5,
      pureAttachTimeoutMs: 5,
      pureAttachIntervalMs: 5,
    });
  }

  it('fails backend integrity for a non-ADB backend', async () => {
    const adapter = createAdapter(false);
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_INVALID_CONFIG',
    });
    await adapter.cleanup();
    expect(backend.closeApp).not.toHaveBeenCalled();
  });

  it('preserves ADB backend identity while passing the wrapper to driver and cleanup', async () => {
    const wrappedBackend = {
      ...backend,
      closeApp: jest.fn().mockResolvedValue(undefined),
    } as DeviceBackend;
    const wrapBackend = jest.fn().mockReturnValue(wrappedBackend);
    const adapter = new AndroidPlatformAdapter({
      createBackend,
      createDriver,
      isAdbBackend: jest.fn().mockReturnValue(true),
      wrapBackend,
      runDeviceAdb: runReadinessAdb,
      now,
      delay: jest.fn(),
      readinessTimeoutMs: 0,
    });
    const resolved = await adapter.resolve({ platform: 'android' });

    await adapter.launch(resolved);
    await adapter.cleanup();

    expect(wrapBackend).toHaveBeenCalledWith(backend, 'emulator-5554');
    expect(createDriver).toHaveBeenCalledWith(wrappedBackend, 'io.metamask');
    expect(wrappedBackend.closeApp).toHaveBeenCalledWith('io.metamask');
  });

  it('identifies the ADB backend by its public kind discriminator', () => {
    expect(isAdbBackend({ kind: 'adb' } as DeviceBackend)).toBe(true);
    expect(isAdbBackend({ kind: 'appium' } as DeviceBackend)).toBe(false);
    expect(isAdbBackend({ kind: 'idb' } as DeviceBackend)).toBe(false);
  });

  it('does not accept process liveness without a recognized startup screen', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('No recognized MetaMask startup screen'),
    });
    expect(mobileDriver.getAppState).toHaveBeenCalled();
  });

  it('polls through transient snapshot failures until a startup screen is visible', async () => {
    jest
      .mocked(mobileDriver.getTestIds)
      .mockRejectedValueOnce(new Error('could not get idle state'))
      .mockResolvedValueOnce([
        { testId: 'login', text: '', tag: 'View', visible: true },
      ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true, isUnlocked: false },
    });
    expect(mobileDriver.getTestIds).toHaveBeenCalledTimes(2);
  });

  it('requires the exact resumed MetaMask activity', async () => {
    runReadinessAdb.mockReturnValue(
      'mResumedActivity: ActivityRecord{abc u0 io.metamask.flask/io.metamask.MainActivity t1}',
    );
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('exact resumed activity'),
    });
    expect(mobileDriver.getTestIds).not.toHaveBeenCalled();
  });

  it('accepts Android shorthand for the exact resumed MetaMask activity', async () => {
    runReadinessAdb.mockReturnValue(
      'topResumedActivity=ActivityRecord{abc u0 io.metamask/.MainActivity t1}',
    );
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
  });

  it('reports login and onboarding screens as locked', async () => {
    jest
      .mocked(mobileDriver.getTestIds)
      .mockResolvedValue([
        { testId: 'onboarding-screen', text: '', tag: 'View', visible: true },
      ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    const result = await adapter.launch(resolved);

    expect(result.state.isUnlocked).toBe(false);
  });

  it('reports an observed wallet screen as unlocked', async () => {
    jest
      .mocked(mobileDriver.getTestIds)
      .mockResolvedValue([
        { testId: 'wallet-screen', text: '', tag: 'View', visible: true },
      ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    const result = await adapter.launch(resolved);

    expect(result.state.isUnlocked).toBe(true);
  });

  it('treats a login marker as locked even when a wallet screen lingers', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([
      { testId: 'login', text: '', tag: 'View', visible: true },
      { testId: 'wallet-screen', text: '', tag: 'View', visible: true },
    ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    const result = await adapter.launch(resolved);

    expect(result.state.isUnlocked).toBe(false);
  });

  it.each([
    {
      name: 'missing',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 0,
        candidates: [],
        noTargetReason: { code: 'HERMES_NO_TARGET', message: 'none' },
      },
    },
    {
      name: 'wrong app',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'wrong',
            appId: 'io.metamask.flask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'wrong', logicalDeviceId: 'metro-device-a' },
      },
    },
    {
      name: 'ambiguous',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 2,
        candidates: [
          { id: 'one', appId: 'io.metamask' },
          { id: 'two', appId: 'io.metamask' },
        ],
        ambiguous: 'multiple logical devices',
      },
    },
    {
      name: 'chosen absent',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
      },
    },
    {
      name: 'chosen without logical device id',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'target-1' },
      },
    },
    {
      name: 'chosen id unresolved',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'missing', logicalDeviceId: 'metro-device-a' },
      },
    },
    {
      name: 'filter bypassed',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: true,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'target-1', logicalDeviceId: 'metro-device-a' },
      },
    },
    {
      name: 'expected app id mismatch',
      result: {
        metroPort: 8081,
        expectedAppId: 'io.metamask.flask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [
          {
            id: 'target-1',
            appId: 'io.metamask',
            logicalDeviceId: 'metro-device-a',
          },
        ],
        chosen: { id: 'target-1', logicalDeviceId: 'metro-device-a' },
      },
    },
  ])('rejects a $name Hermes target in Metro mode', async ({ result }) => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(mobileDriver.hermesTargets).mockResolvedValue(result);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      remediation: expect.stringContaining('Metro has bundled MetaMask'),
    });
  });

  it('accepts an unambiguous io.metamask Hermes target without comparing its Metro logical device ID to the ADB serial', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
    expect(mobileDriver.hermesTargets).toHaveBeenCalledWith({
      metroPort: 8081,
      appId: 'io.metamask',
    });
  });

  it('pure-attaches to a healthy running app without the reloading deep-link', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
    expect(prepareAndroidMetro).toHaveBeenCalledWith('emulator-5554', 8081);
    expect(openAndroidMetroDeepLink).not.toHaveBeenCalled();
  });

  it('adopts the pure-attached app for cleanup force-stop', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);
    await adapter.launch(resolved);

    await adapter.cleanup();

    expect(backend.closeApp).toHaveBeenCalledWith('io.metamask');
  });

  it('deep-links when the app is not the resumed activity', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    runReadinessAdb
      .mockReturnValueOnce('mResumedActivity: other/other.MainActivity')
      .mockReturnValue(resumedActivity);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
    expect(openAndroidMetroDeepLink).toHaveBeenCalledTimes(1);
  });

  it('deep-links when the pure-attach probe finds no healthy Hermes target', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    const healthyTarget = {
      metroPort: 8081,
      expectedAppId: 'io.metamask',
      filterBypassed: false,
      metroDown: false,
      targetsDiscovered: 1,
      candidates: [
        {
          id: 'target-1',
          appId: 'io.metamask',
          logicalDeviceId: 'metro-device-a',
        },
      ],
      chosen: { id: 'target-1', logicalDeviceId: 'metro-device-a' },
    };
    // Metro is down for the whole pure-attach window (clock advances to 5 via
    // the injected delay), then recovers so the post-deep-link wait succeeds.
    jest.mocked(mobileDriver.hermesTargets).mockImplementation(async () =>
      clock <= 5
        ? {
            metroPort: 8081,
            expectedAppId: 'io.metamask',
            filterBypassed: false,
            metroDown: true,
            targetsDiscovered: 0,
            candidates: [],
          }
        : healthyTarget,
    );
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
    expect(openAndroidMetroDeepLink).toHaveBeenCalledTimes(1);
  });

  it('accepts multiple stale/fresh io.metamask Hermes targets on one logical device with an unambiguous chosen', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(mobileDriver.hermesTargets).mockResolvedValue({
      metroPort: 8081,
      expectedAppId: 'io.metamask',
      filterBypassed: false,
      metroDown: false,
      targetsDiscovered: 2,
      candidates: [
        {
          id: 'stale',
          appId: 'io.metamask',
          logicalDeviceId: 'metro-device-a',
        },
        {
          id: 'fresh',
          appId: 'io.metamask',
          logicalDeviceId: 'metro-device-a',
          nativePageReloads: true,
        },
      ],
      chosen: { id: 'fresh', logicalDeviceId: 'metro-device-a' },
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).resolves.toMatchObject({
      state: { isLoaded: true },
    });
  });

  it('does not oversleep the deadline and clamps the final poll delay to the remaining budget', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([]);
    const delay = jest.fn(async (milliseconds: number) => {
      clock += milliseconds;
    });
    const adapter = new AndroidPlatformAdapter({
      createBackend,
      createDriver,
      isAdbBackend: jest.fn().mockReturnValue(true),
      wrapBackend: (rawBackend) => rawBackend,
      runDeviceAdb: runReadinessAdb,
      now,
      delay,
      readinessTimeoutMs: 14,
      readinessIntervalMs: 5,
    });
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
    });

    expect(runReadinessAdb).toHaveBeenCalledTimes(4);
    const lastDelayMs = delay.mock.calls.at(-1)?.[0];
    expect(lastDelayMs).toBe(4);
    expect(lastDelayMs).toBeLessThan(5);
  });

  it('cleans the partial launch after readiness timeout', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
    });
    await adapter.cleanup();

    expect(backend.closeApp).toHaveBeenCalledWith('io.metamask');
    expect(restoreAndroidAnimations).toHaveBeenCalled();
  });

  it('does not stop the app when Metro validation fails before deep linking', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest
      .mocked(prepareAndroidMetro)
      .mockRejectedValueOnce(new Error('Metro not recognized'));
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).rejects.toThrow(
      'Metro not recognized',
    );
    await adapter.cleanup();
    expect(backend.closeApp).not.toHaveBeenCalled();
    expect(restoreAndroidAnimations).toHaveBeenCalled();
  });

  it('cleans owned Metro resources even when app termination falls back', async () => {
    const attachment = {
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    };
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(prepareAndroidMetro).mockResolvedValue(attachment);
    jest
      .mocked(backend.closeApp)
      .mockRejectedValueOnce(new Error('close failed'));
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);
    await adapter.launch(resolved);

    await adapter.cleanup();

    expect(runDeviceAdb).toHaveBeenCalledWith('emulator-5554', [
      'shell',
      'am',
      'force-stop',
      'io.metamask',
    ]);
    expect(cleanupAndroidMetro).toHaveBeenCalledWith(attachment);
    expect(restoreAndroidAnimations).toHaveBeenCalled();
  });

  it('restores animations when Metro cleanup fails', async () => {
    const attachment = {
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    };
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(prepareAndroidMetro).mockResolvedValue(attachment);
    jest.mocked(cleanupAndroidMetro).mockImplementationOnce(() => {
      throw new Error('reverse cleanup failed');
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);
    await adapter.launch(resolved);

    await expect(adapter.cleanup()).rejects.toThrow('reverse cleanup failed');

    expect(restoreAndroidAnimations).toHaveBeenCalled();
  });

  it('retains app-close state on failure and completes it on a second cleanup', async () => {
    const attachment = {
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    };
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(prepareAndroidMetro).mockResolvedValue(attachment);
    jest
      .mocked(backend.closeApp)
      .mockRejectedValueOnce(new Error('close failed'));
    jest.mocked(runDeviceAdb).mockImplementationOnce(() => {
      throw new Error('force-stop failed');
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);
    await adapter.launch(resolved);

    await expect(adapter.cleanup()).rejects.toThrow('force-stop failed');

    expect(cleanupAndroidMetro).toHaveBeenCalledWith(attachment);
    expect(restoreAndroidAnimations).toHaveBeenCalled();

    await adapter.cleanup();

    expect(backend.closeApp).toHaveBeenCalledTimes(2);
    expect(cleanupAndroidMetro).toHaveBeenCalledTimes(1);
    expect(restoreAndroidAnimations).toHaveBeenCalledTimes(1);
  });
});
