/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import { execFileSync } from 'node:child_process';
import {
  generateSessionId,
  knowledgeStore,
  type IPlatformDriver,
  type SessionLaunchInput,
  type StateSnapshotCapability,
  type WorkflowContext,
} from '@metamask/client-mcp-core';
import { MetaMaskMobileSessionManager } from '../metamask-provider';
import {
  createIOSPlatformDriver,
  type CreatedIOSDriver,
} from '../ios/platform-driver-factory';
import { attachToMetroWatchMode } from '../ios/metro-watch-attach';
import { ensureAccessibilityBridgeEnabled } from '../ios/accessibility-bridge';
import { probeHermesHealthy } from '../ios/hermes-health';
import { validateIOSPrerequisites } from '../ios/prerequisites';
import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';

jest.mock('@metamask/client-mcp-core', () => ({
  generateSessionId: jest.fn().mockReturnValue('mm-test-session-id'),
  knowledgeStore: {
    writeSessionMetadata: jest.fn().mockResolvedValue('/tmp/session.json'),
  },
}));
jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('../ios/prerequisites', () => ({
  validateIOSPrerequisites: jest.fn(),
}));
jest.mock('../ios/platform-driver-factory', () => ({
  createIOSPlatformDriver: jest.fn(),
}));
jest.mock('../ios/metro-watch-attach', () => ({
  attachToMetroWatchMode: jest.fn(),
}));
jest.mock('../ios/accessibility-bridge', () => ({
  ensureAccessibilityBridgeEnabled: jest.fn(),
  ACCESSIBILITY_SETTLE_MS: 250,
}));
jest.mock('../ios/hermes-health', () => ({
  probeHermesHealthy: jest.fn(),
  verifyJsLiveness: jest.fn(),
}));

const mockExecFileSync = jest.mocked(execFileSync);
const mockValidateIOSPrerequisites = jest.mocked(validateIOSPrerequisites);
const mockCreateIOSPlatformDriver = jest.mocked(createIOSPlatformDriver);
const mockAttachToMetroWatchMode = jest.mocked(attachToMetroWatchMode);
const mockEnsureAccessibilityBridgeEnabled = jest.mocked(
  ensureAccessibilityBridgeEnabled,
);
const mockProbeHermesHealthy = jest.mocked(probeHermesHealthy);
const mockGenerateSessionId = jest.mocked(generateSessionId);
const mockWriteSessionMetadata = jest.mocked(
  knowledgeStore.writeSessionMetadata,
);

const resolved: ResolvedIOSLaunchOptions = {
  simulatorDeviceId: 'SIM-UDID',
  appBundlePath: '/tmp/MetaMask.app',
  appBundleId: 'io.metamask.MetaMask',
  destination: 'platform=iOS Simulator,id=SIM-UDID',
  appAlreadyInstalled: true,
  selectedAppMetadata: {
    appBundlePath: '/tmp/MetaMask.app',
    bundleId: 'io.metamask.MetaMask',
    foxCode: 'PROD',
    shortVersion: '7.35.0',
    buildVersion: '1',
  },
  installedAppMetadata: null,
  installAction: 'reuse-installed',
};

function createLaunchInput(
  overrides: Partial<SessionLaunchInput> & { force?: boolean } = {},
): SessionLaunchInput & { force?: boolean } {
  return {
    platform: 'ios',
    deviceId: 'SIM-UDID',
    ...overrides,
  };
}

describe('MetaMaskMobileSessionManager', () => {
  let sessionManager: MetaMaskMobileSessionManager;
  let stateSnapshot: StateSnapshotCapability;
  let platformDriver: Pick<IPlatformDriver, 'getAppState' | 'screenshot'>;
  let backend: {
    openApp: jest.MockedFunction<(bundleId: string) => Promise<void>>;
    closeApp: jest.MockedFunction<(bundleId: string) => Promise<void>>;
    getAppState: jest.MockedFunction<
      (
        bundleId: string,
      ) => Promise<{ bundleId: string; state: string; pid?: number }>
    >;
  };
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stateSnapshot = {} as StateSnapshotCapability;
    platformDriver = {
      getAppState: jest.fn().mockResolvedValue({
        isLoaded: true,
        currentUrl: '',
        extensionId: 'io.metamask.MetaMask',
        isUnlocked: false,
        currentScreen: 'unknown',
        accountAddress: null,
        networkName: null,
        chainId: null,
        balance: null,
      }),
      screenshot: jest.fn().mockResolvedValue({ path: '/tmp/screen.png' }),
    };
    backend = {
      openApp: jest.fn().mockResolvedValue(undefined),
      closeApp: jest.fn().mockResolvedValue(undefined),
      getAppState: jest.fn().mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Unknown',
      }),
    };
    mockValidateIOSPrerequisites.mockResolvedValue(resolved);
    mockCreateIOSPlatformDriver.mockResolvedValue({
      driver: platformDriver as IPlatformDriver,
      backend,
    } as unknown as CreatedIOSDriver);
    mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
      wasAlreadyOn: false,
    });
    mockProbeHermesHealthy.mockResolvedValue({
      healthy: false,
      reason: 'HERMES_TARGET_NOT_FOUND',
    });
    mockAttachToMetroWatchMode.mockResolvedValue({ pinnedDeviceId: undefined });
    mockExecFileSync.mockImplementation((file, args) => {
      if (file === 'xcrun' && args?.[1] === 'list') {
        return JSON.stringify({
          devices: { 'iOS 17': [{ udid: 'SIM-UDID', state: 'Booted' }] },
        });
      }
      return Buffer.from('');
    });
    sessionManager = new MetaMaskMobileSessionManager();
    sessionManager.setWorkflowContext({
      config: {
        extensionName: 'MetaMask',
        defaultPassword: '',
        artifactsDir: 'test-artifacts',
        environment: 'prod',
        defaultChainId: 1,
      },
      stateSnapshot,
    } as WorkflowContext);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('always reports the prod environment and a non-switchable prod context', () => {
    expect(sessionManager.getEnvironmentMode()).toBe('prod');
    expect(sessionManager.getContextInfo()).toEqual({
      currentContext: 'prod',
      hasActiveSession: false,
      sessionId: null,
      capabilities: { available: ['stateSnapshot'] },
      canSwitchContext: false,
    });
  });

  it('accepts prod context and clearly rejects e2e context', () => {
    expect(() => sessionManager.setContext('prod')).not.toThrow();
    expect(() => sessionManager.setContext('e2e')).toThrow(
      'MetaMask Mobile supports only the prod context',
    );
  });

  it('keeps E2E capability getters undefined and exposes state snapshot', () => {
    expect(sessionManager.getFixtureCapability()).toBeUndefined();
    expect(sessionManager.getChainCapability()).toBeUndefined();
    expect(sessionManager.getContractSeedingCapability()).toBeUndefined();
    expect(sessionManager.getBuildCapability()).toBeUndefined();
    expect(sessionManager.getStateSnapshotCapability()).toBe(stateSnapshot);
  });

  it('launches installed app state without context or E2E port setup', async () => {
    const result = await sessionManager.launch(createLaunchInput());

    expect(mockValidateIOSPrerequisites).toHaveBeenCalledWith({
      simulatorDeviceId: 'SIM-UDID',
      appBundlePath: undefined,
      metroPort: undefined,
      reinstall: undefined,
      resetAppData: undefined,
      allowFoxCodeMismatch: undefined,
    });
    expect(result.extensionId).toBe('io.metamask.MetaMask');
    expect(sessionManager.getSessionState()?.ports).toEqual({
      anvil: 0,
      fixtureServer: 0,
    });
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'xcrun',
      expect.arrayContaining(['fixtureServerPort']),
      expect.anything(),
    );
  });

  it('generates an mm-prefixed session ID and persists session metadata', async () => {
    await sessionManager.launch(createLaunchInput({ goal: 'test goal' }));

    expect(mockGenerateSessionId).toHaveBeenCalledTimes(1);
    expect(mockWriteSessionMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'mm-test-session-id',
        goal: 'test goal',
        schemaVersion: 1,
      }),
    );
    expect(sessionManager.getSessionMetadata()).toEqual(
      expect.objectContaining({ sessionId: 'mm-test-session-id' }),
    );
  });

  it('completes the launch even when session metadata persistence fails', async () => {
    mockWriteSessionMetadata.mockRejectedValueOnce(new Error('disk full'));

    const result = await sessionManager.launch(
      createLaunchInput({ goal: 'test goal' }),
    );

    expect(result.extensionId).toBe('io.metamask.MetaMask');
    expect(sessionManager.hasActiveSession()).toBe(true);
    expect(sessionManager.getSessionMetadata()).toEqual(
      expect.objectContaining({ sessionId: 'mm-test-session-id' }),
    );
    expect(stderrSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('disk full'),
    );
  });

  it('passes the core deviceId to iOS simulator prerequisite selection', async () => {
    await sessionManager.launch(createLaunchInput({ deviceId: 'INPUT-SIM' }));

    expect(mockValidateIOSPrerequisites).toHaveBeenCalledWith(
      expect.objectContaining({ simulatorDeviceId: 'INPUT-SIM' }),
    );
  });

  it('preserves Metro attachment for not-running app', async () => {
    mockValidateIOSPrerequisites.mockResolvedValueOnce({
      ...resolved,
      metroPort: 8081,
    });

    await sessionManager.launch(createLaunchInput({ metroPort: 8081 }));

    expect(mockAttachToMetroWatchMode).toHaveBeenCalledWith({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
    });
  });

  it('preserves cleanup of app and session state', async () => {
    await sessionManager.launch(createLaunchInput());

    await expect(sessionManager.cleanup()).resolves.toBe(true);
    expect(backend.closeApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    expect(sessionManager.hasActiveSession()).toBe(false);
  });

  it('retains the state snapshot capability across launch and cleanup cycles', async () => {
    await sessionManager.launch(createLaunchInput());
    await sessionManager.cleanup();

    expect(sessionManager.getStateSnapshotCapability()).toBe(stateSnapshot);
    expect(sessionManager.getContextInfo().capabilities.available).toEqual([
      'stateSnapshot',
    ]);

    await expect(sessionManager.launch(createLaunchInput())).resolves.toEqual(
      expect.objectContaining({ extensionId: 'io.metamask.MetaMask' }),
    );
    expect(sessionManager.getStateSnapshotCapability()).toBe(stateSnapshot);
  });

  it('rejects cleanup while a launch is still in progress', async () => {
    const pendingState = platformDriver.getAppState() as ReturnType<
      IPlatformDriver['getAppState']
    >;
    let releaseLaunch: () => void = () => undefined;
    jest.mocked(platformDriver.getAppState).mockReturnValueOnce(
      new Promise((resolve) => {
        releaseLaunch = () => resolve(pendingState);
      }),
    );

    const launchPromise = sessionManager.launch(createLaunchInput());
    await Promise.resolve();

    await expect(sessionManager.cleanup()).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_SESSION_ALREADY_RUNNING',
    });

    releaseLaunch();
    await launchPromise;
  });

  it('tears down a partially launched app when state capture fails', async () => {
    jest
      .mocked(platformDriver.getAppState)
      .mockRejectedValueOnce(new Error('state failed'));

    await expect(
      sessionManager.launch(createLaunchInput()),
    ).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_LAUNCH_FAILED',
      message: 'state failed',
    });
    expect(backend.closeApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    expect(sessionManager.hasActiveSession()).toBe(false);
  });

  it('rejects Android while preserving the iOS error contract', async () => {
    await expect(
      sessionManager.launch(createLaunchInput({ platform: 'android' })),
    ).rejects.toBeInstanceOf(IOSLaunchError);
  });

  it('rejects unsupported E2E launch options with MM_INVALID_CONFIG', async () => {
    await expect(
      sessionManager.launch(createLaunchInput({ stateMode: 'onboarding' })),
    ).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_INVALID_CONFIG',
      message: expect.stringContaining("stateMode='onboarding'"),
    });
    expect(mockValidateIOSPrerequisites).not.toHaveBeenCalled();
  });

  it('install-new path calls simctl install with the resolved bundle path', async () => {
    mockValidateIOSPrerequisites.mockResolvedValueOnce({
      ...resolved,
      installAction: 'install-new',
      appAlreadyInstalled: false,
    });

    await sessionManager.launch(createLaunchInput());

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'install', 'SIM-UDID', '/tmp/MetaMask.app'],
      expect.anything(),
    );
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'uninstall', 'SIM-UDID', 'io.metamask.MetaMask'],
      expect.anything(),
    );
  });

  it('reinstall path uninstalls the existing app before installing the new build', async () => {
    mockValidateIOSPrerequisites.mockResolvedValueOnce({
      ...resolved,
      installAction: 'reinstall',
    });

    await sessionManager.launch(
      createLaunchInput({
        appBundlePath: '/tmp/MetaMask.app',
        reinstall: true,
      }),
    );

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'uninstall', 'SIM-UDID', 'io.metamask.MetaMask'],
      expect.anything(),
    );
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'install', 'SIM-UDID', '/tmp/MetaMask.app'],
      expect.anything(),
    );

    const findSimctlInvocationOrder = (subcommand: string): number => {
      const calls = mockExecFileSync.mock.calls;
      const orders = mockExecFileSync.mock.invocationCallOrder;
      const index = calls.findIndex((call) => {
        const args = call[1];
        return Array.isArray(args) && args[1] === subcommand;
      });
      if (index === -1) {
        throw new Error(`Expected simctl ${subcommand} call was not recorded`);
      }
      return orders[index];
    };

    const uninstallOrder = findSimctlInvocationOrder('uninstall');
    const installOrder = findSimctlInvocationOrder('install');

    expect(uninstallOrder).toBeLessThan(installOrder);
  });

  it('emits a destructive-flag warning to stderr when reinstall is requested', async () => {
    mockValidateIOSPrerequisites.mockResolvedValueOnce({
      ...resolved,
      installAction: 'reinstall',
    });

    await sessionManager.launch(
      createLaunchInput({
        appBundlePath: '/tmp/MetaMask.app',
        reinstall: true,
      }),
    );

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('WARNING: Using destructive flags'),
    );
  });

  it('surfaces simctl stderr text when the install call fails', async () => {
    mockValidateIOSPrerequisites.mockResolvedValueOnce({
      ...resolved,
      installAction: 'install-new',
      appAlreadyInstalled: false,
    });
    mockExecFileSync.mockImplementation((file, args) => {
      if (file === 'xcrun' && args?.[1] === 'list') {
        return JSON.stringify({
          devices: { 'iOS 17': [{ udid: 'SIM-UDID', state: 'Booted' }] },
        });
      }
      if (file === 'xcrun' && args?.[1] === 'install') {
        throw Object.assign(new Error('Command failed: xcrun simctl install'), {
          stderr: Buffer.from('simctl: Invalid device state'),
        });
      }
      return Buffer.from('');
    });

    await expect(
      sessionManager.launch(createLaunchInput()),
    ).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('simctl: Invalid device state'),
    });
  });

  it('throws MM_DEVICE_NOT_AVAILABLE with stderr text when booting the simulator fails', async () => {
    mockExecFileSync.mockImplementation((file, args) => {
      if (file === 'xcrun' && args?.[1] === 'list') {
        return JSON.stringify({
          devices: { 'iOS 17': [{ udid: 'SIM-UDID', state: 'Shutdown' }] },
        });
      }
      if (file === 'xcrun' && args?.[1] === 'boot') {
        throw Object.assign(new Error('Command failed: xcrun simctl boot'), {
          stderr: Buffer.from('simctl: Unable to boot device'),
        });
      }
      return Buffer.from('');
    });

    await expect(
      sessionManager.launch(createLaunchInput()),
    ).rejects.toMatchObject({
      name: 'IOSLaunchError',
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: expect.stringContaining('simctl: Unable to boot device'),
    });
  });

  describe('state-gated launch decision matrix', () => {
    it('1.1 pure attach: app Running + bridge already on + Hermes healthy → no deep-link, no relaunch', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        metroPort: 8081,
      });
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: true,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Running',
      });
      mockProbeHermesHealthy.mockResolvedValue({
        healthy: true,
        target: {
          id: 't1',
          appId: 'io.metamask.MetaMask',
          webSocketDebuggerUrl: 'ws://localhost:8081/page/1',
          reactNative: { logicalDeviceId: 'SIM-UDID' },
        },
        pinnedDeviceId: 'SIM-UDID',
      });

      await sessionManager.launch(createLaunchInput({ metroPort: 8081 }));

      expect(mockProbeHermesHealthy).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8081, appId: 'io.metamask.MetaMask' }),
      );
      expect(mockAttachToMetroWatchMode).not.toHaveBeenCalled();
      expect(backend.openApp).not.toHaveBeenCalled();
    });

    it('1.3a stale→relaunch: app Running + bridge on + Hermes unhealthy → terminate + deep-link', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        metroPort: 8081,
      });
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: true,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Running',
      });
      mockProbeHermesHealthy.mockResolvedValue({
        healthy: false,
        reason: 'HERMES_TARGET_NOT_FOUND',
      });

      await sessionManager.launch(createLaunchInput({ metroPort: 8081 }));

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
      expect(mockAttachToMetroWatchMode).toHaveBeenCalledWith({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        appBundleId: 'io.metamask.MetaMask',
      });
    });

    it('1.4 metro-down error: /status not reachable → MM_INVALID_CONFIG', async () => {
      mockValidateIOSPrerequisites.mockRejectedValueOnce(
        new IOSLaunchError({
          code: 'MM_INVALID_CONFIG',
          message: 'Metro bundler not reachable on port 8081',
          remediation: 'Run `yarn watch:clean` in another terminal.',
        }),
      );

      await expect(
        sessionManager.launch(createLaunchInput({ metroPort: 8081 })),
      ).rejects.toMatchObject({
        code: 'MM_INVALID_CONFIG',
        message: expect.stringContaining('Metro bundler not reachable'),
      });
    });

    it('1.3b not-installed error: app state Not Installed → MM_INVALID_CONFIG', async () => {
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Not Installed',
      });

      await expect(
        sessionManager.launch(createLaunchInput()),
      ).rejects.toMatchObject({
        code: 'MM_INVALID_CONFIG',
        message: expect.stringContaining('not installed'),
      });
    });

    it('3.1 install-explicit then launch: new binary → terminate + deep-link', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        metroPort: 8081,
        installAction: 'install-explicit',
      });

      await sessionManager.launch(
        createLaunchInput({
          metroPort: 8081,
          appBundlePath: '/tmp/MetaMask.app',
        }),
      );

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'install', 'SIM-UDID', '/tmp/MetaMask.app'],
        expect.anything(),
      );
      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
      expect(mockAttachToMetroWatchMode).toHaveBeenCalledWith({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        appBundleId: 'io.metamask.MetaMask',
      });
      expect(backend.getAppState).not.toHaveBeenCalled();
    });

    it('--force: active session + force → cleanup then launch', async () => {
      await sessionManager.launch(createLaunchInput());
      expect(sessionManager.hasActiveSession()).toBe(true);

      await sessionManager.launch(createLaunchInput({ force: true }));

      expect(sessionManager.hasActiveSession()).toBe(true);
      expect(backend.closeApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    });

    it('rejects second launch without --force with MM_SESSION_ALREADY_RUNNING', async () => {
      await sessionManager.launch(createLaunchInput());

      await expect(
        sessionManager.launch(createLaunchInput()),
      ).rejects.toMatchObject({
        code: 'MM_SESSION_ALREADY_RUNNING',
        message: expect.stringContaining('--force'),
      });
    });

    it('fresh-boot a11y relaunch: app Running + bridge just flipped → terminate + deep-link', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        metroPort: 8081,
      });
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: false,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Running',
      });

      await sessionManager.launch(createLaunchInput({ metroPort: 8081 }));

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
      expect(mockAttachToMetroWatchMode).toHaveBeenCalledWith({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        appBundleId: 'io.metamask.MetaMask',
      });
      expect(mockProbeHermesHealthy).not.toHaveBeenCalled();
    });

    it('prod pure attach: app Running + bridge on → no openApp, no terminate', async () => {
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: true,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Running',
      });

      await sessionManager.launch(createLaunchInput());

      expect(backend.openApp).not.toHaveBeenCalled();
      expect(mockExecFileSync).not.toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
    });

    it('prod fresh-boot a11y relaunch: app Running + bridge flipped → terminate + openApp', async () => {
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: false,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Running',
      });

      await sessionManager.launch(createLaunchInput());

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
      expect(backend.openApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    });

    it('prod not-running launch: app Not Running + bridge on → openApp, no terminate', async () => {
      mockEnsureAccessibilityBridgeEnabled.mockReturnValue({
        wasAlreadyOn: true,
      });
      backend.getAppState.mockResolvedValue({
        bundleId: 'io.metamask.MetaMask',
        state: 'Not Running',
      });

      await sessionManager.launch(createLaunchInput());

      expect(backend.openApp).toHaveBeenCalledWith('io.metamask.MetaMask');
      expect(mockExecFileSync).not.toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        expect.anything(),
      );
    });
  });
});
