import type {
  IPlatformDriver,
  SessionLaunchInput,
  StateSnapshotCapability,
  WorkflowContext,
} from '@metamask/client-mcp-core';

import { AndroidLaunchError, IOSLaunchError } from '../launcher-types';
import { MetaMaskMobileSessionManager } from '../metamask-provider';
import type {
  LaunchedMobileSession,
  MobilePlatformAdapter,
  ResolvedMobileLaunchOptions,
} from '../platform-adapter';

jest.mock('@metamask/client-mcp-core', () => ({}));

const state = {
  isLoaded: true,
  currentUrl: '',
  extensionId: 'io.metamask.MetaMask',
  isUnlocked: false,
  currentScreen: 'unknown',
  accountAddress: null,
  networkName: null,
  chainId: null,
  balance: null,
};

function createLaunchInput(
  overrides: Partial<SessionLaunchInput> = {},
): SessionLaunchInput {
  return { platform: 'ios', deviceId: 'SIM-UDID', ...overrides };
}

describe('MetaMaskMobileSessionManager', () => {
  let manager: MetaMaskMobileSessionManager;
  let mobileDriver: Pick<IPlatformDriver, 'getAppState' | 'screenshot'>;
  let iosResolve: jest.Mock;
  let iosLaunch: jest.Mock;
  let iosCleanup: jest.Mock;
  let androidResolve: jest.Mock;
  let androidLaunch: jest.Mock;
  let androidCleanup: jest.Mock;
  let iosAdapter: MobilePlatformAdapter;
  let androidAdapter: MobilePlatformAdapter;
  let createIOSAdapter: jest.MockedFunction<() => MobilePlatformAdapter>;
  let createAndroidAdapter: jest.MockedFunction<() => MobilePlatformAdapter>;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    mobileDriver = {
      getAppState: jest.fn().mockResolvedValue(state),
      screenshot: jest.fn().mockResolvedValue({ path: '/tmp/screen.png' }),
    };
    const iosResolved: ResolvedMobileLaunchOptions = {
      platform: 'ios',
      deviceId: 'SIM-UDID',
      appId: 'io.metamask.MetaMask',
      appPath: '/tmp/MetaMask.app',
      metadataLines: [],
    };
    const androidResolved: ResolvedMobileLaunchOptions = {
      platform: 'android',
      deviceId: 'emulator-5554',
      appId: 'io.metamask',
      appPath: 'android-package://io.metamask',
      metadataLines: [],
    };
    const launched: LaunchedMobileSession = {
      driver: mobileDriver as IPlatformDriver,
      state,
    };
    iosResolve = jest.fn().mockResolvedValue(iosResolved);
    iosLaunch = jest.fn().mockResolvedValue(launched);
    iosCleanup = jest.fn().mockResolvedValue(undefined);
    androidResolve = jest.fn().mockResolvedValue(androidResolved);
    androidLaunch = jest.fn().mockResolvedValue({
      ...launched,
      state: { ...state, extensionId: 'io.metamask' },
    });
    androidCleanup = jest.fn().mockResolvedValue(undefined);
    iosAdapter = {
      resolve: iosResolve,
      launch: iosLaunch,
      cleanup: iosCleanup,
    };
    androidAdapter = {
      resolve: androidResolve,
      launch: androidLaunch,
      cleanup: androidCleanup,
    };
    createIOSAdapter = jest.fn(() => iosAdapter);
    createAndroidAdapter = jest.fn(() => androidAdapter);
    manager = new MetaMaskMobileSessionManager({
      createIOSAdapter,
      createAndroidAdapter,
    });
  });

  afterEach(() => stderrSpy.mockRestore());

  it.each([undefined, 'browser', 'ios'] as const)(
    'routes platform %s to iOS',
    async (platform) => {
      await manager.launch(createLaunchInput({ platform }));

      expect(createIOSAdapter).toHaveBeenCalledTimes(1);
      expect(createAndroidAdapter).not.toHaveBeenCalled();
      expect(iosResolve).toHaveBeenCalledWith(
        expect.objectContaining({ platform }),
        undefined,
      );
    },
  );

  it.each([undefined, 'browser', 'ios'] as const)(
    'preserves IOSLaunchError for shared policy failures on platform %s',
    async (platform) => {
      const launch = manager.launch(
        createLaunchInput({ platform, stateMode: 'onboarding' }),
      );

      await expect(launch).rejects.toBeInstanceOf(IOSLaunchError);
      await expect(launch).rejects.toMatchObject({ name: 'IOSLaunchError' });
    },
  );

  it('uses AndroidLaunchError for explicit Android shared policy failures', async () => {
    const launch = manager.launch(
      createLaunchInput({ platform: 'android', stateMode: 'onboarding' }),
    );

    await expect(launch).rejects.toBeInstanceOf(AndroidLaunchError);
    await expect(launch).rejects.toMatchObject({ name: 'AndroidLaunchError' });
  });

  it('routes only explicit android to Android', async () => {
    const result = await manager.launch(
      createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
    );

    expect(createAndroidAdapter).toHaveBeenCalledTimes(1);
    expect(createIOSAdapter).not.toHaveBeenCalled();
    expect(result.extensionId).toBe('io.metamask');
  });

  it('accepts prod context and rejects e2e context', () => {
    expect(() => manager.setContext('prod')).not.toThrow();
    expect(() => manager.setContext('e2e')).toThrow(
      'MetaMask Mobile supports only the prod context',
    );
  });

  it('keeps E2E capabilities undefined and exposes state snapshots', () => {
    const stateSnapshot = {} as StateSnapshotCapability;
    manager.setWorkflowContext({ stateSnapshot } as WorkflowContext);

    expect(manager.getBuildCapability()).toBeUndefined();
    expect(manager.getFixtureCapability()).toBeUndefined();
    expect(manager.getChainCapability()).toBeUndefined();
    expect(manager.getContractSeedingCapability()).toBeUndefined();
    expect(manager.getStateSnapshotCapability()).toBe(stateSnapshot);
  });

  it('stores zero E2E ports and the adapter-resolved app ID in session state', async () => {
    await manager.launch(
      createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
    );

    expect(manager.getSessionState()).toEqual(
      expect.objectContaining({
        extensionId: 'io.metamask',
        ports: { anvil: 0, fixtureServer: 0 },
        stateMode: 'default',
      }),
    );
  });

  it('rejects a second launch while a session is active and hints at --force', async () => {
    await manager.launch(createLaunchInput());

    const secondLaunch = manager.launch(createLaunchInput());
    await expect(secondLaunch).rejects.toBeInstanceOf(IOSLaunchError);
    await expect(secondLaunch).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_SESSION_ALREADY_RUNNING',
      message: expect.stringContaining('--force'),
    });
    expect(createIOSAdapter).toHaveBeenCalledTimes(1);
  });

  it('allows a launch after cleanup clears the active session (core --force path)', async () => {
    await manager.launch(createLaunchInput());

    // Core `launchTool` runs `cleanup()` before `launch()` for `--force`; the
    // session manager no longer handles `force`, so this guards that contract.
    await expect(manager.cleanup()).resolves.toBe(true);

    await expect(manager.launch(createLaunchInput())).resolves.toMatchObject({
      extensionId: 'io.metamask.MetaMask',
      state: { isLoaded: true },
    });
    expect(createIOSAdapter).toHaveBeenCalledTimes(2);
  });

  it('returns false when cleanup has no active session', async () => {
    await expect(manager.cleanup()).resolves.toBe(false);
    expect(iosCleanup).not.toHaveBeenCalled();
    expect(androidCleanup).not.toHaveBeenCalled();
  });

  it('rejects cleanup while launch is in progress', async () => {
    let releaseLaunch: (result: LaunchedMobileSession) => void = () =>
      undefined;
    iosLaunch.mockReturnValueOnce(
      new Promise<LaunchedMobileSession>((resolve) => {
        releaseLaunch = resolve;
      }),
    );
    const launchPromise = manager.launch(createLaunchInput());
    await Promise.resolve();

    const cleanup = manager.cleanup();
    await expect(cleanup).rejects.toBeInstanceOf(IOSLaunchError);
    await expect(cleanup).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_SESSION_ALREADY_RUNNING',
    });

    releaseLaunch({ driver: mobileDriver as IPlatformDriver, state });
    await launchPromise;
  });

  it('delegates cleanup to the active adapter, resets session state, and retains workflow capabilities', async () => {
    const stateSnapshot = {} as StateSnapshotCapability;
    manager.setWorkflowContext({ stateSnapshot } as WorkflowContext);
    await manager.launch(createLaunchInput());

    await expect(manager.cleanup()).resolves.toBe(true);
    expect(iosCleanup).toHaveBeenCalledTimes(1);
    expect(manager.hasActiveSession()).toBe(false);
    expect(manager.getStateSnapshotCapability()).toBe(stateSnapshot);
    expect(manager.getContextInfo().capabilities.available).toEqual([
      'stateSnapshot',
    ]);
  });

  it('keeps the session after a failed adapter cleanup and fully resets after a subsequent successful one', async () => {
    await manager.launch(createLaunchInput());
    expect(manager.hasActiveSession()).toBe(true);

    iosCleanup.mockRejectedValueOnce(new Error('cleanup failed'));

    await expect(manager.cleanup()).rejects.toThrow('cleanup failed');
    expect(manager.hasActiveSession()).toBe(true);
    expect(iosCleanup).toHaveBeenCalledTimes(1);

    await expect(manager.cleanup()).resolves.toBe(true);
    expect(manager.hasActiveSession()).toBe(false);
    expect(iosCleanup).toHaveBeenCalledTimes(2);
  });

  it('retains the adapter when partial-launch teardown fails and cleans it up on a later cleanup', async () => {
    androidLaunch.mockRejectedValueOnce(new Error('readiness failed'));
    androidCleanup.mockRejectedValueOnce(new Error('teardown failed'));

    await expect(
      manager.launch(
        createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
      ),
    ).rejects.toMatchObject({
      name: 'AndroidLaunchError',
      code: 'MM_LAUNCH_FAILED',
      message: 'readiness failed',
    });
    expect(androidCleanup).toHaveBeenCalledTimes(1);
    expect(manager.hasActiveSession()).toBe(false);

    await expect(manager.cleanup()).resolves.toBe(true);
    expect(androidCleanup).toHaveBeenCalledTimes(2);
    expect(manager.hasActiveSession()).toBe(false);
  });

  it('blocks a relaunch while a failed partial-launch teardown is still pending', async () => {
    androidLaunch.mockRejectedValueOnce(new Error('readiness failed'));
    androidCleanup.mockRejectedValueOnce(new Error('teardown failed'));

    await expect(
      manager.launch(
        createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
      ),
    ).rejects.toBeInstanceOf(AndroidLaunchError);

    const relaunch = manager.launch(
      createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
    );
    await expect(relaunch).rejects.toMatchObject({
      name: 'AndroidLaunchError',
      code: 'MM_SESSION_ALREADY_RUNNING',
    });
    expect(androidLaunch).toHaveBeenCalledTimes(1);

    await expect(manager.cleanup()).resolves.toBe(true);
  });

  it('delegates partial-failure teardown, resets session state, and retains workflow capabilities', async () => {
    const stateSnapshot = {} as StateSnapshotCapability;
    manager.setWorkflowContext({ stateSnapshot } as WorkflowContext);
    iosLaunch.mockRejectedValueOnce(new Error('launch failed'));

    await expect(manager.launch(createLaunchInput())).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_LAUNCH_FAILED',
      message: 'launch failed',
    });
    expect(iosCleanup).toHaveBeenCalledTimes(1);
    expect(manager.hasActiveSession()).toBe(false);
    expect(manager.getStateSnapshotCapability()).toBe(stateSnapshot);
    expect(manager.getContextInfo().capabilities.available).toEqual([
      'stateSnapshot',
    ]);
  });

  it('wraps unknown iOS adapter errors as IOSLaunchError', async () => {
    iosLaunch.mockRejectedValueOnce(new Error('unknown iOS failure'));

    await expect(manager.launch(createLaunchInput())).rejects.toBeInstanceOf(
      IOSLaunchError,
    );
  });

  it('wraps unknown Android errors and delegates partial cleanup to Android', async () => {
    androidLaunch.mockRejectedValueOnce(new Error('unknown Android failure'));

    const launch = manager.launch(
      createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
    );

    await expect(launch).rejects.toBeInstanceOf(AndroidLaunchError);
    expect(androidCleanup).toHaveBeenCalledTimes(1);
    expect(iosCleanup).not.toHaveBeenCalled();
  });

  it('preserves Android error remediation in the message returned to the CLI', async () => {
    androidLaunch.mockRejectedValueOnce(
      new AndroidLaunchError({
        code: 'MM_DEVICE_NOT_AVAILABLE',
        message: 'No online authorized Android emulator was found.',
        remediation: 'Start one Android emulator.',
      }),
    );

    await expect(
      manager.launch(
        createLaunchInput({ platform: 'android', deviceId: 'emulator-5554' }),
      ),
    ).rejects.toMatchObject({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message:
        'No online authorized Android emulator was found.\nRemediation: Start one Android emulator.',
      remediation: 'Start one Android emulator.',
    });
  });

  it('preserves the original launch error when partial cleanup also fails', async () => {
    iosLaunch.mockRejectedValueOnce(new Error('original launch failure'));
    iosCleanup.mockRejectedValueOnce(new Error('teardown failure'));

    await expect(manager.launch(createLaunchInput())).rejects.toMatchObject({
      name: 'IOSLaunchError',
      message: 'original launch failure',
    });
    expect(stderrSpy).toHaveBeenCalledWith(
      '[mm-mobile] Partial launch teardown failed: teardown failure\n',
    );
    expect(manager.hasActiveSession()).toBe(false);
    expect(manager.getPlatformDriver()).toBeUndefined();
  });

  it.each([
    { stateMode: 'onboarding' },
    { fixturePreset: 'foo' },
    { fixture: {} },
    { seedContracts: ['Token'] },
    { ports: { anvil: 1, fixtureServer: 2 } },
  ] satisfies readonly Partial<SessionLaunchInput>[])(
    'preserves shared prod-only restriction for $stateMode$fixturePreset',
    async (unsupported) => {
      await expect(
        manager.launch(createLaunchInput(unsupported)),
      ).rejects.toMatchObject({
        code: 'MM_INVALID_CONFIG',
        message: expect.stringContaining('Unsupported E2E launch option'),
      });
      expect(createIOSAdapter).not.toHaveBeenCalled();
      expect(createAndroidAdapter).not.toHaveBeenCalled();
    },
  );

  it('reports prod context and exposes state snapshots', () => {
    const stateSnapshot = {} as StateSnapshotCapability;
    manager.setWorkflowContext({ stateSnapshot } as WorkflowContext);

    expect(manager.getEnvironmentMode()).toBe('prod');
    expect(manager.getStateSnapshotCapability()).toBe(stateSnapshot);
    expect(manager.getContextInfo()).toEqual({
      currentContext: 'prod',
      hasActiveSession: false,
      sessionId: null,
      capabilities: { available: ['stateSnapshot'] },
      canSwitchContext: false,
    });
  });
});
