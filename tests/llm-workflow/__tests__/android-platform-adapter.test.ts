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
  attachAndroidMetro,
  cleanupAndroidMetro,
} from '../android/metro-watch-attach';
import {
  AndroidPlatformAdapter,
  getAndroidBackendConstructor,
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
  attachAndroidMetro: jest.fn(),
  cleanupAndroidMetro: jest.fn(),
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
      platform: 'android',
      openApp: jest.fn().mockResolvedValue(undefined),
      closeApp: jest.fn().mockResolvedValue(undefined),
    } as unknown as DeviceBackend;
    mobileDriver = {
      getAppState: jest.fn().mockResolvedValue(loadedState),
      getTestIds: jest.fn().mockResolvedValue([
        { testId: 'metamask-app-root', text: '', tag: 'View', visible: true },
        { testId: 'login', text: '', tag: 'View', visible: true },
      ]),
      hermesTargets: jest.fn().mockResolvedValue({
        metroPort: 8081,
        expectedAppId: 'io.metamask',
        filterBypassed: false,
        metroDown: false,
        targetsDiscovered: 1,
        candidates: [{ id: 'target-1', appId: 'io.metamask' }],
        chosen: { id: 'target-1', logicalDeviceId: 'logical-device' },
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
    });
  }

  it('fails backend integrity for a non-ADB backend', async () => {
    const adapter = createAdapter(false);
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_ANDROID_BACKEND_INTEGRITY',
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

    expect(wrapBackend).toHaveBeenCalledWith(backend);
    expect(createDriver).toHaveBeenCalledWith(wrappedBackend, 'io.metamask');
    expect(wrappedBackend.closeApp).toHaveBeenCalledWith('io.metamask');
  });

  it('recognizes the production AdbBackend constructor without connecting', () => {
    const { AdbBackend } = getAndroidBackendConstructor();
    const actualBackend = new AdbBackend('emulator-5554');

    expect(isAdbBackend(actualBackend)).toBe(true);
    expect(isAdbBackend({ platform: 'android' } as DeviceBackend)).toBe(false);
  });

  it('does not accept process liveness without the mounted React root', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_ANDROID_RUNNER_NOT_READY',
      message: expect.stringContaining('metamask-app-root'),
    });
    expect(mobileDriver.getAppState).toHaveBeenCalled();
  });

  it('polls through transient snapshot failures until the root marker is visible', async () => {
    jest
      .mocked(mobileDriver.getTestIds)
      .mockRejectedValueOnce(new Error('could not get idle state'))
      .mockResolvedValueOnce([
        { testId: 'metamask-app-root', text: '', tag: 'View', visible: true },
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
      code: 'MM_ANDROID_RUNNER_NOT_READY',
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

  it('reports login, onboarding, and root-only screens as locked', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([
      { testId: 'metamask-app-root', text: '', tag: 'View', visible: true },
      { testId: 'onboarding-screen', text: '', tag: 'View', visible: true },
    ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    const result = await adapter.launch(resolved);

    expect(result.state.isUnlocked).toBe(false);
  });

  it('reports an observed wallet screen as unlocked', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([
      { testId: 'metamask-app-root', text: '', tag: 'View', visible: true },
      { testId: 'wallet-screen', text: '', tag: 'View', visible: true },
    ]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    const result = await adapter.launch(resolved);

    expect(result.state.isUnlocked).toBe(true);
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
        candidates: [{ id: 'wrong', appId: 'io.metamask.flask' }],
        chosen: { id: 'wrong' },
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
  ])('rejects a $name Hermes target in Metro mode', async ({ result }) => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest.mocked(mobileDriver.hermesTargets).mockResolvedValue(result);
    jest
      .mocked(attachAndroidMetro)
      .mockImplementation(async (_serial, _port, _fetch, beforeOpen) => {
        beforeOpen?.();
        return { serial: 'emulator-5554', metroPort: 8081, ownsReverse: true };
      });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_ANDROID_RUNNER_NOT_READY',
      remediation: expect.stringContaining('Metro has bundled MetaMask'),
    });
  });

  it('accepts exactly one io.metamask Hermes target without comparing its logical device ID to ADB', async () => {
    mockValidate.mockReturnValue({
      serial: 'emulator-5554',
      appId: 'io.metamask',
      mainActivity: 'io.metamask/io.metamask.MainActivity',
      metroPort: 8081,
    });
    jest
      .mocked(attachAndroidMetro)
      .mockImplementation(async (_serial, _port, _fetch, beforeOpen) => {
        beforeOpen?.();
        return { serial: 'emulator-5554', metroPort: 8081, ownsReverse: true };
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

  it('cleans the partial launch after readiness timeout', async () => {
    jest.mocked(mobileDriver.getTestIds).mockResolvedValue([]);
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' });

    await expect(adapter.launch(resolved)).rejects.toMatchObject({
      code: 'MM_ANDROID_RUNNER_NOT_READY',
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
      .mocked(attachAndroidMetro)
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
    jest
      .mocked(attachAndroidMetro)
      .mockImplementation(async (_serial, _port, _fetch, beforeOpen) => {
        beforeOpen?.();
        return attachment;
      });
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
    jest
      .mocked(attachAndroidMetro)
      .mockImplementation(async (_serial, _port, _fetch, beforeOpen) => {
        beforeOpen?.();
        return attachment;
      });
    jest.mocked(cleanupAndroidMetro).mockImplementationOnce(() => {
      throw new Error('reverse cleanup failed');
    });
    const adapter = createAdapter();
    const resolved = await adapter.resolve({ platform: 'android' }, 8081);
    await adapter.launch(resolved);

    await expect(adapter.cleanup()).rejects.toThrow('reverse cleanup failed');

    expect(restoreAndroidAnimations).toHaveBeenCalled();
  });
});
