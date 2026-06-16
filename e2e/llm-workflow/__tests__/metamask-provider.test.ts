/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import { execFileSync } from 'node:child_process';
import {
  bootDevice,
  isBooted,
  stopRunner,
  terminateApp,
  type ChainCapability,
  type ContractSeedingCapability,
  type FixtureCapability,
  type IPlatformDriver,
  type MockServerCapability,
  type SessionLaunchInput,
  type StateSnapshotCapability,
  type WorkflowContext,
} from '@metamask/client-mcp-core';
import { MetaMaskMobileSessionManager } from '../metamask-provider';
import {
  bindAndCreateIOSDriver,
  startIOSRunner,
  type CreatedIOSDriver,
  type StartedIOSRunner,
} from '../ios/platform-driver-factory';
import { attachToMetroWatchMode } from '../ios/metro-watch-attach';
import { validateIOSPrerequisites } from '../ios/prerequisites';
import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from '../launcher-types';

jest.mock('@metamask/client-mcp-core', () => ({
  bootDevice: jest.fn(),
  isBooted: jest.fn(),
  terminateApp: jest.fn(),
  stopRunner: jest.fn(),
}));
jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('../ios/prerequisites', () => ({
  validateIOSPrerequisites: jest.fn(),
}));
jest.mock('../ios/platform-driver-factory', () => ({
  startIOSRunner: jest.fn(),
  bindAndCreateIOSDriver: jest.fn(),
  createIOSPlatformDriver: jest.fn(),
}));
jest.mock('../ios/metro-watch-attach', () => ({
  attachToMetroWatchMode: jest.fn(),
}));

const mockBootDevice = bootDevice as jest.MockedFunction<typeof bootDevice>;
const mockIsBooted = isBooted as jest.MockedFunction<typeof isBooted>;
const mockTerminateApp = terminateApp as jest.MockedFunction<
  typeof terminateApp
>;
const mockStopRunner = stopRunner as jest.MockedFunction<typeof stopRunner>;
const mockExecFileSync = execFileSync as jest.MockedFunction<
  typeof execFileSync
>;
const mockValidateIOSPrerequisites =
  validateIOSPrerequisites as jest.MockedFunction<
    typeof validateIOSPrerequisites
  >;
const mockStartIOSRunner = startIOSRunner as jest.MockedFunction<
  typeof startIOSRunner
>;
const mockBindAndCreateIOSDriver =
  bindAndCreateIOSDriver as jest.MockedFunction<typeof bindAndCreateIOSDriver>;
const mockAttachToMetroWatchMode =
  attachToMetroWatchMode as jest.MockedFunction<typeof attachToMetroWatchMode>;

type MockDriver = Pick<IPlatformDriver, 'getAppState' | 'screenshot'>;

const defaultState = { data: { default: true }, meta: { version: 1 } };
const onboardingState = { data: { onboarding: true }, meta: { version: 1 } };
const customState = { data: { custom: true }, meta: { version: 1 } };

describe('MetaMaskMobileSessionManager', () => {
  let sessionManager: MetaMaskMobileSessionManager;
  let mockChain: jest.Mocked<ChainCapability>;
  let mockFixture: jest.Mocked<FixtureCapability>;
  let mockMockServer: jest.Mocked<MockServerCapability>;
  let mockContractSeeding: jest.Mocked<ContractSeedingCapability>;
  let mockStateSnapshot: jest.Mocked<StateSnapshotCapability>;
  let mockDriver: jest.Mocked<MockDriver>;
  let mockClient: { shutdown: jest.MockedFunction<() => Promise<void>> };
  let resolved: ResolvedIOSLaunchOptions;
  let stderrSpy: jest.SpyInstance;
  let originalMetroPort: string | undefined;

  const createLaunchInput = (
    overrides: Partial<
      SessionLaunchInput & {
        reinstall?: boolean;
        resetAppData?: boolean;
        allowFoxCodeMismatch?: boolean;
      }
    > = {},
  ): SessionLaunchInput => ({
    platform: 'ios',
    appBundlePath: '/tmp/MetaMask.app',
    simulatorDeviceId: 'SIM-UDID',
    stateMode: 'default',
    ...overrides,
  });

  const setWorkflowContext = (environment: 'e2e' | 'prod' = 'e2e') => {
    sessionManager.setContext(environment);
    sessionManager.setWorkflowContext({
      chain: mockChain,
      fixture: mockFixture,
      contractSeeding: mockContractSeeding,
      stateSnapshot: mockStateSnapshot,
      mockServer: mockMockServer,
      config: {
        extensionName: 'MetaMask',
        defaultPassword: 'correct horse battery staple',
        artifactsDir: 'test-artifacts',
        environment,
        defaultChainId: environment === 'e2e' ? 1337 : 1,
      },
    } as unknown as WorkflowContext);
  };

  const launchSession = async (overrides: Partial<SessionLaunchInput> = {}) =>
    sessionManager.launch(createLaunchInput(overrides));

  beforeEach(() => {
    jest.clearAllMocks();
    originalMetroPort = process.env.MM_METRO_PORT;
    delete process.env.MM_METRO_PORT;
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    mockChain = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<ChainCapability>;
    mockFixture = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      getDefaultState: jest.fn().mockReturnValue(defaultState),
      getOnboardingState: jest.fn().mockReturnValue(onboardingState),
      resolvePreset: jest.fn().mockReturnValue(customState),
    } as unknown as jest.Mocked<FixtureCapability>;
    mockMockServer = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MockServerCapability>;
    mockContractSeeding = {
      initialize: jest.fn(),
      deployContract: jest
        .fn()
        .mockResolvedValue({ name: 'hst', address: '0x1', deployedAt: '' }),
      deployContracts: jest
        .fn()
        .mockResolvedValue({ deployed: [], failed: [] }),
      getContractAddress: jest.fn().mockReturnValue(null),
      listDeployedContracts: jest.fn().mockReturnValue([]),
      getAvailableContracts: jest.fn().mockReturnValue([]),
      clearRegistry: jest.fn(),
    } as unknown as jest.Mocked<ContractSeedingCapability>;
    mockStateSnapshot = {} as jest.Mocked<StateSnapshotCapability>;
    mockDriver = {
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
    } as unknown as jest.Mocked<MockDriver>;
    mockClient = { shutdown: jest.fn().mockResolvedValue(undefined) };
    resolved = {
      simulatorDeviceId: 'SIM-UDID',
      appBundlePath: '/tmp/MetaMask.app',
      appBundleId: 'io.metamask.MetaMask',
      destination: 'platform=iOS Simulator,id=SIM-UDID',
      appAlreadyInstalled: false,
      selectedAppMetadata: {
        appBundlePath: '/tmp/MetaMask.app',
        bundleId: 'io.metamask.MetaMask',
        foxCode: null,
        shortVersion: '7.35.0',
        buildVersion: '1',
      },
      installedAppMetadata: null,
      installAction: 'install-new',
    };
    mockValidateIOSPrerequisites.mockResolvedValue(resolved);
    mockIsBooted.mockResolvedValue(true);
    mockBootDevice.mockResolvedValue(undefined);
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    mockStartIOSRunner.mockResolvedValue({
      client: mockClient,
      runnerPort: 8100,
      derivedDataPath: '/tmp/DerivedData',
    } as unknown as StartedIOSRunner);
    mockBindAndCreateIOSDriver.mockResolvedValue({
      driver: mockDriver,
      client: mockClient,
      runnerPort: 8100,
    } as unknown as CreatedIOSDriver);
    mockAttachToMetroWatchMode.mockResolvedValue(undefined);
    mockTerminateApp.mockResolvedValue(undefined);
    mockStopRunner.mockResolvedValue(undefined);
    sessionManager = new MetaMaskMobileSessionManager();
    setWorkflowContext();
  });

  afterEach(() => {
    if (originalMetroPort === undefined) {
      delete process.env.MM_METRO_PORT;
    } else {
      process.env.MM_METRO_PORT = originalMetroPort;
    }
    stderrSpy.mockRestore();
    jest.resetAllMocks();
  });

  describe('lifecycle', () => {
    it('hasActiveSession returns false before launch', () => {
      const result = sessionManager.hasActiveSession();

      expect(result).toBe(false);
    });

    it('isLaunchInProgress reflects ongoing launch', async () => {
      let resolvePrereqs: (value: ResolvedIOSLaunchOptions) => void = () =>
        undefined;
      mockValidateIOSPrerequisites.mockReturnValue(
        new Promise((resolve) => {
          resolvePrereqs = resolve;
        }),
      );

      const launchPromise = launchSession();
      await Promise.resolve();

      expect(sessionManager.isLaunchInProgress()).toBe(true);
      resolvePrereqs(resolved);
      await launchPromise;
    });

    it('getSessionId returns undefined before launch', () => {
      const result = sessionManager.getSessionId();

      expect(result).toBeUndefined();
    });

    it('launch throws MM_SESSION_ALREADY_RUNNING when called twice', async () => {
      await launchSession();

      await expect(launchSession()).rejects.toMatchObject({
        code: 'MM_SESSION_ALREADY_RUNNING',
      });
    });
  });

  describe('platform validation', () => {
    it('launch throws MM_LAUNCH_FAILED for platform === android', async () => {
      await expect(
        launchSession({ platform: 'android' }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
      });
    });

    it('launch treats undefined platform as ios', async () => {
      await launchSession({ platform: undefined });

      expect(mockValidateIOSPrerequisites).toHaveBeenCalled();
    });

    it('launch treats platform === browser as ios', async () => {
      await launchSession({ platform: 'browser' });

      expect(mockValidateIOSPrerequisites).toHaveBeenCalled();
    });
  });

  describe('orchestration order', () => {
    it('launch calls validateIOSPrerequisites with the simulator and app bundle path from input', async () => {
      await launchSession({
        simulatorDeviceId: 'INPUT-SIM',
        appBundlePath: '/input/App.app',
      });

      expect(mockValidateIOSPrerequisites).toHaveBeenCalledWith({
        simulatorDeviceId: 'INPUT-SIM',
        appBundlePath: '/input/App.app',
        metroPort: undefined,
        context: 'e2e',
        reinstall: undefined,
        resetAppData: undefined,
        allowFoxCodeMismatch: undefined,
      });
    });

    it('launch boots simulator when not already booted', async () => {
      mockIsBooted.mockResolvedValueOnce(false);

      await launchSession();

      expect(mockBootDevice).toHaveBeenCalledWith('SIM-UDID');
    });

    it('launch skips bootDevice when simulator already booted', async () => {
      mockIsBooted.mockResolvedValueOnce(true);

      await launchSession();

      expect(mockBootDevice).not.toHaveBeenCalled();
    });

    it('launch installs the app via execFileSync simctl install', async () => {
      await launchSession();

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'xcrun',
        ['simctl', 'install', 'SIM-UDID', '/tmp/MetaMask.app'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    });

    it('launch skips app installation when installAction is reuse-installed', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installAction: 'reuse-installed',
      });

      await launchSession();

      const installCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'install',
      );
      expect(installCalls).toHaveLength(0);
    });

    it('launch calls startIOSRunner then bindAndCreateIOSDriver', async () => {
      await launchSession();

      expect(mockStartIOSRunner).toHaveBeenCalledWith({ resolved });
      expect(mockBindAndCreateIOSDriver).toHaveBeenCalledWith({
        resolved,
        started: await mockStartIOSRunner.mock.results[0].value,
      });
    });

    it('launch starts e2e capabilities in order: chain → fixture → mockServer', async () => {
      const sequence: string[] = [];
      mockChain.start.mockImplementation(async () => {
        sequence.push('chain');
      });
      mockFixture.start.mockImplementation(async () => {
        sequence.push('fixture');
      });
      mockMockServer.start.mockImplementation(async () => {
        sequence.push('mockServer');
      });

      await launchSession();

      expect(sequence).toEqual(['chain', 'fixture', 'mockServer']);
    });

    it('launch uses default fixture state when input.stateMode is default', async () => {
      await launchSession({ stateMode: 'default' });

      expect(mockFixture.start).toHaveBeenCalledWith(defaultState);
    });

    it('launch uses onboarding fixture state when input.stateMode is onboarding', async () => {
      await launchSession({ stateMode: 'onboarding' });

      expect(mockFixture.start).toHaveBeenCalledWith(onboardingState);
    });

    it('launch resolves preset fixture when input.stateMode is custom', async () => {
      await launchSession({
        stateMode: 'custom',
        fixturePreset: 'with-tokens',
      });

      expect(mockFixture.resolvePreset).toHaveBeenCalledWith('with-tokens');
      expect(mockFixture.start).toHaveBeenCalledWith(customState);
    });
  });

  describe('Metro watch mode', () => {
    it('launch calls attachToMetroWatchMode when resolved.metroPort is set', async () => {
      process.env.MM_METRO_PORT = '8081';
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        metroPort: 8081,
      });

      await launchSession();

      expect(mockAttachToMetroWatchMode).toHaveBeenCalledWith({
        simulatorUdid: 'SIM-UDID',
        metroPort: 8081,
        appBundleId: 'io.metamask.MetaMask',
      });
    });

    it('launch does NOT call attachToMetroWatchMode when resolved.metroPort is undefined', async () => {
      await launchSession();

      expect(mockAttachToMetroWatchMode).not.toHaveBeenCalled();
    });
  });

  describe('destructive flags', () => {
    it('--reinstall calls simctl uninstall when installAction is reinstall, then installs', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installedAppMetadata: resolved.selectedAppMetadata,
        installAction: 'reinstall',
      });

      await launchSession({ reinstall: true });

      const uninstallCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'uninstall',
      );
      expect(uninstallCalls).toHaveLength(1);
      expect(uninstallCalls[0]).toEqual([
        'xcrun',
        ['simctl', 'uninstall', 'SIM-UDID', 'io.metamask.MetaMask'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);

      const installCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'install',
      );
      expect(installCalls).toHaveLength(1);
    });

    it('--reset-app-data calls simctl terminate then uninstall, then reinstalls', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installedAppMetadata: resolved.selectedAppMetadata,
        installAction: 'reset-and-install',
      });

      await launchSession({ resetAppData: true });

      const terminateCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'terminate',
      );
      expect(terminateCalls).toHaveLength(1);
      expect(terminateCalls[0]).toEqual([
        'xcrun',
        ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      ]);

      const uninstallCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'uninstall',
      );
      expect(uninstallCalls).toHaveLength(1);

      const installCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          call[1]?.[1] === 'install',
      );
      expect(installCalls).toHaveLength(1);
    });

    it('reuse-installed skips install and uninstall', async () => {
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installAction: 'reuse-installed',
      });

      await launchSession();

      const installCalls = mockExecFileSync.mock.calls.filter(
        (call) =>
          call[0] === 'xcrun' &&
          call[1]?.[0] === 'simctl' &&
          (call[1]?.[1] === 'install' || call[1]?.[1] === 'uninstall'),
      );
      expect(installCalls).toHaveLength(0);
    });

    it('destructive flags in prod context emit warning to stderr', async () => {
      setWorkflowContext('prod');
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installAction: 'reinstall',
      });

      await launchSession({ reinstall: true });

      const stderrOutput = stderrSpy.mock.calls
        .map((call: [string]) => call[0])
        .join('');
      expect(stderrOutput).toContain('WARNING: Using destructive flags');
    });

    it('destructive flags in e2e context do NOT emit the warning', async () => {
      sessionManager.setContext('e2e');
      mockValidateIOSPrerequisites.mockResolvedValueOnce({
        ...resolved,
        appAlreadyInstalled: true,
        installAction: 'reinstall',
      });

      await launchSession({ reinstall: true });

      const stderrOutput = stderrSpy.mock.calls
        .map((call: [string]) => call[0])
        .join('');
      expect(stderrOutput).not.toContain('WARNING: Using destructive flags');
    });
  });

  describe('resolveMetroPort', () => {
    afterEach(() => {
      delete process.env.MM_METRO_PORT;
    });

    it('neither provided → launch does not attach to Metro', async () => {
      delete process.env.MM_METRO_PORT;

      await launchSession();

      expect(mockAttachToMetroWatchMode).not.toHaveBeenCalled();
    });

    it('input.metroPort = 8081 → validateIOSPrerequisites called with metroPort: 8081 regardless of MM_METRO_PORT', async () => {
      process.env.MM_METRO_PORT = '8082';

      await launchSession({ metroPort: 8081 });

      expect(mockValidateIOSPrerequisites).toHaveBeenCalledWith(
        expect.objectContaining({ metroPort: 8081 }),
      );
    });

    it('no input.metroPort, MM_METRO_PORT=8082 → validateIOSPrerequisites called with metroPort: 8082', async () => {
      process.env.MM_METRO_PORT = '8082';
      await launchSession();

      expect(mockValidateIOSPrerequisites).toHaveBeenCalledWith(
        expect.objectContaining({ metroPort: 8082 }),
      );
    });
  });

  describe('cleanup', () => {
    it('cleanup returns false when no active session', async () => {
      const result = await sessionManager.cleanup();

      expect(result).toBe(false);
    });

    it('cleanup stops capabilities in reverse order before stopping runner', async () => {
      const sequence: string[] = [];
      mockMockServer.stop.mockImplementation(async () => {
        sequence.push('mockServer');
      });
      mockFixture.stop.mockImplementation(async () => {
        sequence.push('fixture');
      });
      mockChain.stop.mockImplementation(async () => {
        sequence.push('chain');
      });
      mockStopRunner.mockImplementation(async () => {
        sequence.push('runner');
      });
      await launchSession();

      await sessionManager.cleanup();

      expect(sequence).toEqual(['mockServer', 'fixture', 'chain', 'runner']);
    });

    it('cleanup calls terminateApp and stopRunner', async () => {
      await launchSession();

      await sessionManager.cleanup();

      expect(mockTerminateApp).toHaveBeenCalledWith(
        'SIM-UDID',
        'io.metamask.MetaMask',
      );
      expect(mockStopRunner).toHaveBeenCalledWith(
        'platform=iOS Simulator,id=SIM-UDID',
      );
    });

    it('cleanup resets internal state', async () => {
      await launchSession();

      await sessionManager.cleanup();

      expect(sessionManager.hasActiveSession()).toBe(false);
      expect(sessionManager.getSessionId()).toBeUndefined();
      expect(sessionManager.getPlatformDriver()).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('launch rewrites unknown error as IOSLaunchError MM_LAUNCH_FAILED', async () => {
      mockStartIOSRunner.mockRejectedValueOnce(new Error('boom'));

      await expect(launchSession()).rejects.toMatchObject({
        name: 'IOSLaunchError',
        code: 'MM_LAUNCH_FAILED',
        message: 'boom',
      });
    });

    it('launch preserves IOSLaunchError code when prereqs fail', async () => {
      mockValidateIOSPrerequisites.mockRejectedValueOnce(
        new IOSLaunchError({
          code: 'MM_IOS_RUNNER_NOT_READY',
          message: 'runner unavailable',
        }),
      );

      await expect(launchSession()).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
      });
    });

    it('does not double-prefix the code in IOSLaunchError messages', async () => {
      mockValidateIOSPrerequisites.mockRejectedValueOnce(
        new IOSLaunchError({
          code: 'MM_IOS_RUNNER_NOT_READY',
          message: 'runner unavailable',
          remediation: 'boot a simulator',
        }),
      );
      await expect(launchSession()).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: 'runner unavailable',
        remediation: 'boot a simulator',
      });
    });

    it('launch writes formatted code+message+remediation to stderr for IOSLaunchError', async () => {
      mockValidateIOSPrerequisites.mockRejectedValueOnce(
        new IOSLaunchError({
          code: 'MM_IOS_RUNNER_NOT_READY',
          message: 'runner unavailable',
          remediation: 'boot a simulator',
        }),
      );
      await expect(launchSession()).rejects.toThrow();

      const stderrOutput = stderrSpy.mock.calls
        .map((call: [string]) => call[0])
        .join('');
      expect(stderrOutput).toContain('MM_IOS_RUNNER_NOT_READY');
      expect(stderrOutput).toContain('runner unavailable');
      expect(stderrOutput).toContain('Remediation: boot a simulator');
    });

    it('tears down runner when bindAndCreateIOSDriver fails after startIOSRunner', async () => {
      mockBindAndCreateIOSDriver.mockRejectedValueOnce(
        new Error('bind failed'),
      );

      await expect(launchSession()).rejects.toThrow();

      expect(mockStopRunner).toHaveBeenCalledWith(
        'platform=iOS Simulator,id=SIM-UDID',
      );
      expect(sessionManager.hasActiveSession()).toBe(false);
      expect(sessionManager.getPlatformDriver()).toBeUndefined();
    });

    it('tears down runner and capabilities when startE2ECapabilities fails', async () => {
      mockChain.start.mockRejectedValueOnce(new Error('anvil failed'));

      await expect(launchSession()).rejects.toThrow();

      expect(mockStopRunner).toHaveBeenCalledWith(
        'platform=iOS Simulator,id=SIM-UDID',
      );
      expect(sessionManager.hasActiveSession()).toBe(false);
      expect(sessionManager.getPlatformDriver()).toBeUndefined();
    });

    it('tears down runner when getAppState fails after capabilities start', async () => {
      mockDriver.getAppState.mockRejectedValueOnce(new Error('state failed'));

      await expect(launchSession()).rejects.toThrow();

      expect(mockChain.stop).toHaveBeenCalled();
      expect(mockFixture.stop).toHaveBeenCalled();
      expect(mockMockServer.stop).toHaveBeenCalled();
      expect(mockStopRunner).toHaveBeenCalledWith(
        'platform=iOS Simulator,id=SIM-UDID',
      );
      expect(sessionManager.hasActiveSession()).toBe(false);
    });
  });

  describe('platform driver', () => {
    it('getPlatformDriver returns undefined before launch', () => {
      const result = sessionManager.getPlatformDriver();

      expect(result).toBeUndefined();
    });

    it('setPlatformDriver updates internal driver', () => {
      sessionManager.setPlatformDriver(
        mockDriver as unknown as IPlatformDriver,
      );

      const result = sessionManager.getPlatformDriver();

      expect(result).toBe(mockDriver);
    });

    it('getPlatformDriver returns the iOS driver after successful launch', async () => {
      await launchSession();

      const result = sessionManager.getPlatformDriver();
      expect(result).toBe(mockDriver);
    });
  });

  describe('capabilities getters', () => {
    it('getChainCapability returns workflowContext.chain', () => {
      const result = sessionManager.getChainCapability();

      expect(result).toBe(mockChain);
    });

    it('getFixtureCapability returns workflowContext.fixture', () => {
      const result = sessionManager.getFixtureCapability();

      expect(result).toBe(mockFixture);
    });

    it('getContractSeedingCapability returns workflowContext.contractSeeding', () => {
      const result = sessionManager.getContractSeedingCapability();

      expect(result).toBe(mockContractSeeding);
    });

    it('getStateSnapshotCapability returns workflowContext.stateSnapshot', () => {
      const result = sessionManager.getStateSnapshotCapability();

      expect(result).toBe(mockStateSnapshot);
    });

    it('getBuildCapability returns undefined', () => {
      const result = sessionManager.getBuildCapability();

      expect(result).toBeUndefined();
    });
  });

  describe('context switching', () => {
    it('setContext throws when session is active', async () => {
      await launchSession();

      expect(() => sessionManager.setContext('prod')).toThrow(
        'MM_CONTEXT_SWITCH_BLOCKED',
      );
    });

    it('setContext updates currentContext when no active session', () => {
      sessionManager.setContext('e2e');

      expect(sessionManager.getEnvironmentMode()).toBe('e2e');
    });

    it('getEnvironmentMode returns the current context', () => {
      setWorkflowContext('prod');

      const result = sessionManager.getEnvironmentMode();

      expect(result).toBe('prod');
    });

    it('getContextInfo returns canSwitchContext=true when no session', () => {
      const result = sessionManager.getContextInfo();

      expect(result.canSwitchContext).toBe(true);
    });

    it('getContextInfo returns canSwitchContext=false when active', async () => {
      await launchSession();

      const result = sessionManager.getContextInfo();

      expect(result.canSwitchContext).toBe(false);
    });
  });

  describe('contract seeding initialization', () => {
    it('launch initializes contractSeeding AFTER chain.start when in e2e mode', async () => {
      const sequence: string[] = [];
      mockChain.start.mockImplementation(async () => {
        sequence.push('chain.start');
      });
      (mockContractSeeding.initialize as jest.Mock).mockImplementation(() => {
        sequence.push('contractSeeding.initialize');
      });
      mockFixture.start.mockImplementation(async () => {
        sequence.push('fixture.start');
      });
      mockMockServer.start.mockImplementation(async () => {
        sequence.push('mockServer.start');
      });

      await launchSession();

      expect(sequence).toEqual([
        'chain.start',
        'contractSeeding.initialize',
        'fixture.start',
        'mockServer.start',
      ]);
    });

    it('launch does NOT initialize contractSeeding when in prod mode', async () => {
      setWorkflowContext('prod');

      await launchSession();

      expect(mockContractSeeding.initialize).not.toHaveBeenCalled();
    });

    it('launch calls deployContracts when input.seedContracts is provided', async () => {
      await launchSession({ seedContracts: ['hst', 'nfts'] });

      expect(mockContractSeeding.deployContracts).toHaveBeenCalledWith([
        'hst',
        'nfts',
      ]);
    });

    it('launch does NOT call deployContracts when seedContracts is undefined', async () => {
      await launchSession();

      expect(mockContractSeeding.deployContracts).not.toHaveBeenCalled();
    });

    it('launch does NOT call deployContracts when seedContracts is empty', async () => {
      await launchSession({ seedContracts: [] });

      expect(mockContractSeeding.deployContracts).not.toHaveBeenCalled();
    });

    it('launch logs failures from deployContracts to stderr', async () => {
      (mockContractSeeding.deployContracts as jest.Mock).mockResolvedValue({
        deployed: [],
        failed: [{ name: 'nfts', error: 'boom' }],
      });

      await launchSession({ seedContracts: ['nfts'] });

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('nfts'));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('launch does NOT throw when individual deployContracts entries fail', async () => {
      (mockContractSeeding.deployContracts as jest.Mock).mockResolvedValue({
        deployed: [{ name: 'hst', address: '0x1', deployedAt: '' }],
        failed: [{ name: 'nfts', error: 'deploy error' }],
      });

      const result = await launchSession({ seedContracts: ['hst', 'nfts'] });

      expect(result.sessionId).toBeDefined();
    });

    it('launch throws MM_LAUNCH_FAILED when seedContracts provided but currentContext is prod', async () => {
      setWorkflowContext('prod');

      await expect(
        launchSession({ seedContracts: ['hst'] }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining('e2e context'),
      });
    });

    it('launch throws MM_LAUNCH_FAILED when seedContracts provided but contractSeeding capability is missing', async () => {
      sessionManager.setWorkflowContext({
        chain: mockChain,
        fixture: mockFixture,
        contractSeeding: undefined,
        stateSnapshot: mockStateSnapshot,
        mockServer: mockMockServer,
        config: {
          extensionName: 'MetaMask',
          defaultPassword: 'correct horse battery staple',
          artifactsDir: 'test-artifacts',
          environment: 'e2e',
          defaultChainId: 1337,
        },
      } as unknown as WorkflowContext);
      sessionManager.setContext('e2e');

      await expect(
        launchSession({ seedContracts: ['hst'] }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining('contractSeeding capabilities'),
      });
    });
  });
});
