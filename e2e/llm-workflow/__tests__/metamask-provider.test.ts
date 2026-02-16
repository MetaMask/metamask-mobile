import {
  type SessionLaunchInput,
  type BuildCapability,
  type FixtureCapability,
  type ChainCapability,
  type ContractSeedingCapability,
  type StateSnapshotCapability,
  type MockServerCapability,
  type WorkflowContext,
  ErrorCodes,
  knowledgeStore,
  getPlatformDriver,
} from '@metamask/client-mcp-core';
import { MetaMaskMobileSessionManager } from '../mcp-server/metamask-provider';
import { launchMetaMaskMobile } from '../app-launcher';

jest.mock('@metamask/client-mcp-core');
jest.mock('../app-launcher');

const mockKnowledgeStore = knowledgeStore as jest.Mocked<typeof knowledgeStore>;
const mockGetPlatformDriver = getPlatformDriver as jest.MockedFunction<
  typeof getPlatformDriver
>;
const mockLaunchMetaMaskMobile = launchMetaMaskMobile as jest.MockedFunction<
  typeof launchMetaMaskMobile
>;

describe('MetaMaskMobileSessionManager', () => {
  let sessionManager: MetaMaskMobileSessionManager;

  // Mock capabilities
  let mockBuild: jest.Mocked<BuildCapability>;
  let mockChain: jest.Mocked<ChainCapability>;
  let mockFixture: jest.Mocked<FixtureCapability>;
  let mockMockServer: jest.Mocked<MockServerCapability>;
  let mockSeeding: jest.Mocked<ContractSeedingCapability>;
  let mockStateSnapshot: jest.Mocked<StateSnapshotCapability>;
  let mockLauncher: { stop: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock capabilities
    mockBuild = {
      build: jest.fn().mockResolvedValue({
        success: true,
        extensionPath: '/path/app',
      }),
    } as unknown as jest.Mocked<BuildCapability>;

    mockChain = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setPort: jest.fn(),
      isRunning: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<ChainCapability>;

    mockFixture = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setPort: jest.fn(),
      getDefaultState: jest.fn().mockReturnValue({
        data: {},
        meta: { version: 1 },
      }),
      resolvePreset: jest.fn(),
      getOnboardingState: jest.fn(),
    } as unknown as jest.Mocked<FixtureCapability>;

    mockMockServer = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setPort: jest.fn(),
    } as unknown as jest.Mocked<MockServerCapability>;

    mockSeeding = {
      initialize: jest.fn(),
      clearRegistry: jest.fn(),
      deployContracts: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ContractSeedingCapability>;

    mockStateSnapshot = {
      getState: jest.fn().mockResolvedValue({
        isLoaded: true,
        currentUrl: '',
        extensionId: 'ios-app',
        isUnlocked: false,
        currentScreen: 'unknown',
        accountAddress: null,
        networkName: null,
        chainId: null,
        balance: null,
      }),
    } as unknown as jest.Mocked<StateSnapshotCapability>;

    mockLauncher = {
      stop: jest.fn().mockResolvedValue(undefined),
    };

    mockLaunchMetaMaskMobile.mockResolvedValue(mockLauncher as never);

    // Setup knowledge store mock
    mockKnowledgeStore.writeSessionMetadata = jest
      .fn()
      .mockResolvedValue(undefined);

    // Setup platform driver mock
    mockGetPlatformDriver.mockReturnValue(null);

    // Create session manager
    sessionManager = new MetaMaskMobileSessionManager();

    // Set workflow context with all mocks
    sessionManager.setWorkflowContext({
      build: mockBuild,
      fixture: mockFixture,
      chain: mockChain,
      contractSeeding: mockSeeding,
      stateSnapshot: mockStateSnapshot,
      mockServer: mockMockServer,
      config: {
        extensionName: 'MetaMask',
        toolPrefix: 'mm',
        environment: 'e2e',
        defaultChainId: 1337,
      },
    } as unknown as WorkflowContext);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('launch - failure recovery', () => {
    it('stops chain when fixture.start() throws', async () => {
      const fixtureError = new Error('Fixture failed');
      mockFixture.start.mockRejectedValueOnce(fixtureError);

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'Fixture failed',
      );

      expect(mockChain.start).toHaveBeenCalled();
      expect(mockChain.stop).toHaveBeenCalled();
      expect(mockFixture.start).toHaveBeenCalled();
    });

    it('stops chain and fixture when mock server start throws', async () => {
      const mockServerError = new Error('Mock server failed');
      mockMockServer.start.mockRejectedValueOnce(mockServerError);

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'Mock server failed',
      );

      expect(mockChain.start).toHaveBeenCalled();
      expect(mockChain.stop).toHaveBeenCalled();
      expect(mockFixture.start).toHaveBeenCalled();
      expect(mockFixture.stop).toHaveBeenCalled();
      expect(mockMockServer.start).toHaveBeenCalled();
    });

    it('stops all services when app launcher throws', async () => {
      const launcherError = new Error('App launcher failed');
      mockLaunchMetaMaskMobile.mockRejectedValueOnce(launcherError);

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'App launcher failed',
      );

      expect(mockChain.start).toHaveBeenCalled();
      expect(mockChain.stop).toHaveBeenCalled();
      expect(mockFixture.start).toHaveBeenCalled();
      expect(mockFixture.stop).toHaveBeenCalled();
      expect(mockMockServer.start).toHaveBeenCalled();
      expect(mockMockServer.stop).toHaveBeenCalled();
      expect(mockSeeding.initialize).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('clears contract seeding registry on cleanup', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);
      expect(sessionManager.hasActiveSession()).toBe(true);

      await sessionManager.cleanup();

      expect(mockSeeding.clearRegistry).toHaveBeenCalled();
    });

    it('clears session state on cleanup', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);
      expect(sessionManager.hasActiveSession()).toBe(true);

      await sessionManager.cleanup();

      expect(sessionManager.hasActiveSession()).toBe(false);
    });
  });

  describe('launch - port recording', () => {
    it('records provided ports in session state', async () => {
      const customAnvilPort = 9999;
      const customFixturePort = 54321;

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        ports: {
          anvil: customAnvilPort,
          fixtureServer: customFixturePort,
        },
      };

      await sessionManager.launch(launchInput);

      const sessionState = sessionManager.getSessionState();
      expect(sessionState?.ports.anvil).toBe(customAnvilPort);
      expect(sessionState?.ports.fixtureServer).toBe(customFixturePort);
    });
  });

  describe('launch - basic success', () => {
    it('creates active session with generated sessionId', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      const result = await sessionManager.launch(launchInput);

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^mm-ios-/);
      expect(sessionManager.hasActiveSession()).toBe(true);
      expect(sessionManager.getSessionId()).toBe(result.sessionId);
    });

    it('calls all capabilities in correct order', async () => {
      const callOrder: string[] = [];

      mockChain.start.mockImplementation(async () => {
        callOrder.push('chain.start');
      });
      mockFixture.start.mockImplementation(async () => {
        callOrder.push('fixture.start');
      });
      mockMockServer.start.mockImplementation(async () => {
        callOrder.push('mockServer.start');
      });
      mockSeeding.initialize.mockImplementation(() => {
        callOrder.push('seeding.initialize');
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);

      expect(callOrder).toEqual([
        'chain.start',
        'fixture.start',
        'mockServer.start',
        'seeding.initialize',
      ]);
    });

    it('sets ports on capabilities before starting', async () => {
      const customAnvilPort = 7777;
      const customFixturePort = 11111;

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        ports: {
          anvil: customAnvilPort,
          fixtureServer: customFixturePort,
        },
      };

      await sessionManager.launch(launchInput);

      expect(mockChain.setPort).toHaveBeenCalledWith(customAnvilPort);
      expect(mockFixture.setPort).toHaveBeenCalledWith(customFixturePort);
    });

    it('initializes contract seeding when no contracts provided', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);

      expect(mockSeeding.initialize).toHaveBeenCalled();
      expect(mockSeeding.deployContracts).not.toHaveBeenCalled();
    });

    it('deploys contracts when seedContracts provided', async () => {
      const contracts = [
        { name: 'TestToken', code: '0x123' },
        { name: 'TestNFT', code: '0x456' },
      ];

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        seedContracts: contracts as never,
      };

      await sessionManager.launch(launchInput);

      expect(mockSeeding.initialize).toHaveBeenCalled();
      expect(mockSeeding.deployContracts).toHaveBeenCalledWith(contracts);
    });

    it('writes session metadata to knowledge store', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        goal: 'Test goal',
        tags: ['test-tag'],
      };

      await sessionManager.launch(launchInput);

      expect(mockKnowledgeStore.writeSessionMetadata).toHaveBeenCalled();
      const callArgs = mockKnowledgeStore.writeSessionMetadata.mock.calls[0][0];
      expect(callArgs.goal).toBe('Test goal');
      expect(callArgs.tags).toContain('test-tag');
    });
  });

  describe('launch - autoBuild', () => {
    it('builds app when autoBuild is true', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: true,
      };

      await sessionManager.launch(launchInput);

      expect(mockBuild.build).toHaveBeenCalledWith({ force: false });
    });

    it('uses extensionPath from build result when appBundlePath not provided', async () => {
      const buildPath = '/built/app.app';
      mockBuild.build.mockResolvedValueOnce({
        success: true,
        extensionPath: buildPath,
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: true,
      };

      await sessionManager.launch(launchInput);

      expect(mockLaunchMetaMaskMobile).toHaveBeenCalledWith(
        expect.objectContaining({
          appBundlePath: buildPath,
        }),
      );
    });

    it('throws error when autoBuild is true but BuildCapability not available', async () => {
      sessionManager.setWorkflowContext({
        fixture: mockFixture,
        chain: mockChain,
        contractSeeding: mockSeeding,
        stateSnapshot: mockStateSnapshot,
        mockServer: mockMockServer,
        config: {
          extensionName: 'MetaMask',
          toolPrefix: 'mm',
          environment: 'e2e',
          defaultChainId: 1337,
        },
      } as unknown as WorkflowContext);

      const launchInput: SessionLaunchInput = {
        autoBuild: true,
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'autoBuild is enabled but BuildCapability is not available',
      );
    });

    it('throws error when build fails', async () => {
      mockBuild.build.mockResolvedValueOnce({
        success: false,
        error: 'Build compilation failed',
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: true,
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'Build failed: Build compilation failed',
      );
    });
  });

  describe('launch - state modes', () => {
    it('uses default state when stateMode is default', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        stateMode: 'default',
      };

      await sessionManager.launch(launchInput);

      expect(mockFixture.getDefaultState).toHaveBeenCalled();
      expect(mockFixture.resolvePreset).not.toHaveBeenCalled();
    });

    it('uses onboarding state when stateMode is onboarding', async () => {
      mockFixture.getOnboardingState = jest.fn().mockReturnValue({
        data: {},
        meta: { version: 1 },
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        stateMode: 'onboarding',
      };

      await sessionManager.launch(launchInput);

      expect(mockFixture.getOnboardingState).toHaveBeenCalled();
    });

    it('resolves preset when stateMode is custom with fixturePreset', async () => {
      mockFixture.resolvePreset = jest.fn().mockReturnValue({
        data: {},
        meta: { version: 1 },
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        stateMode: 'custom',
        fixturePreset: 'my-preset',
      };

      await sessionManager.launch(launchInput);

      expect(mockFixture.resolvePreset).toHaveBeenCalledWith('my-preset');
    });

    it('uses custom fixture when stateMode is custom with fixture object', async () => {
      const customFixture = { data: { custom: true } };

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        stateMode: 'custom',
        fixture: customFixture as never,
      };

      await sessionManager.launch(launchInput);

      expect(mockFixture.start).toHaveBeenCalledWith(
        expect.objectContaining({
          data: customFixture,
        }),
      );
    });
  });

  describe('launch - error handling', () => {
    it('throws error when session already active', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        ErrorCodes.MM_SESSION_ALREADY_RUNNING,
      );
    });

    it('throws error when seedContracts provided but ContractSeedingCapability not available', async () => {
      sessionManager.setWorkflowContext({
        build: mockBuild,
        fixture: mockFixture,
        chain: mockChain,
        stateSnapshot: mockStateSnapshot,
        mockServer: mockMockServer,
        config: {
          extensionName: 'MetaMask',
          toolPrefix: 'mm',
          environment: 'e2e',
          defaultChainId: 1337,
        },
      } as unknown as WorkflowContext);

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        seedContracts: [{ name: 'Test', code: '0x123' }] as never,
      };

      await expect(sessionManager.launch(launchInput)).rejects.toThrow(
        'seedContracts provided but ContractSeedingCapability is not available',
      );
    });

    it('continues on knowledge store write failure', async () => {
      mockKnowledgeStore.writeSessionMetadata.mockRejectedValueOnce(
        new Error('Store failed'),
      );

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      const result = await sessionManager.launch(launchInput);

      expect(result.sessionId).toBeDefined();
      expect(sessionManager.hasActiveSession()).toBe(true);
    });
  });

  describe('cleanup - error handling', () => {
    it('continues cleanup when launcher.stop() throws', async () => {
      mockLauncher.stop.mockRejectedValueOnce(
        new Error('Launcher stop failed'),
      );

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);
      const cleanupResult = await sessionManager.cleanup();

      expect(cleanupResult).toBe(true);
      expect(mockMockServer.stop).toHaveBeenCalled();
      expect(mockFixture.stop).toHaveBeenCalled();
      expect(mockChain.stop).toHaveBeenCalled();
    });

    it('returns false when no active session', async () => {
      const result = await sessionManager.cleanup();

      expect(result).toBe(false);
    });

    it('stops all services in correct order during cleanup', async () => {
      const stopOrder: string[] = [];

      mockLauncher.stop.mockImplementation(async () => {
        stopOrder.push('launcher.stop');
      });
      mockMockServer.stop.mockImplementation(async () => {
        stopOrder.push('mockServer.stop');
      });
      mockFixture.stop.mockImplementation(async () => {
        stopOrder.push('fixture.stop');
      });
      mockChain.stop.mockImplementation(async () => {
        stopOrder.push('chain.stop');
      });

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);
      await sessionManager.cleanup();

      expect(stopOrder).toEqual([
        'launcher.stop',
        'mockServer.stop',
        'fixture.stop',
        'chain.stop',
      ]);
    });
  });

  describe('session state', () => {
    it('returns undefined session state when no active session', () => {
      const state = sessionManager.getSessionState();

      expect(state).toBeUndefined();
    });

    it('returns session metadata after launch', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        goal: 'Test goal',
      };

      await sessionManager.launch(launchInput);

      const metadata = sessionManager.getSessionMetadata();
      expect(metadata?.goal).toBe('Test goal');
      expect(metadata?.sessionId).toBeDefined();
    });

    it('clears session metadata on cleanup', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);
      expect(sessionManager.getSessionMetadata()).toBeDefined();

      await sessionManager.cleanup();

      expect(sessionManager.getSessionMetadata()).toBeUndefined();
    });
  });

  describe('setContext', () => {
    it('switches to prod context with build and stateSnapshot only', () => {
      sessionManager.setContext('prod');

      const contextInfo = sessionManager.getContextInfo();

      expect(contextInfo.currentContext).toBe('prod');
      expect(contextInfo.capabilities.available).toContain('build');
      expect(contextInfo.capabilities.available).toContain('stateSnapshot');
      expect(contextInfo.capabilities.available).not.toContain('fixture');
      expect(contextInfo.capabilities.available).not.toContain('chain');
      expect(contextInfo.capabilities.available).not.toContain(
        'contractSeeding',
      );
      expect(contextInfo.capabilities.available).not.toContain('mockServer');
    });

    it('switches back to e2e context with all capabilities', () => {
      sessionManager.setContext('prod');
      expect(sessionManager.getEnvironmentMode()).toBe('prod');

      sessionManager.setContext('e2e');

      const contextInfo = sessionManager.getContextInfo();
      expect(contextInfo.currentContext).toBe('e2e');
      expect(contextInfo.capabilities.available).toContain('build');
      expect(contextInfo.capabilities.available).toContain('fixture');
      expect(contextInfo.capabilities.available).toContain('chain');
      expect(contextInfo.capabilities.available).toContain('contractSeeding');
      expect(contextInfo.capabilities.available).toContain('stateSnapshot');
      expect(contextInfo.capabilities.available).toContain('mockServer');
    });

    it('throws when switching context during active session', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);

      expect(() => {
        sessionManager.setContext('prod');
      }).toThrow(ErrorCodes.MM_CONTEXT_SWITCH_BLOCKED);
    });
  });

  describe('launch - prod context', () => {
    beforeEach(() => {
      sessionManager.setContext('prod');
    });

    it('skips chain, fixture, mock server, and seeding in prod mode', async () => {
      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
      };

      await sessionManager.launch(launchInput);

      expect(mockChain.start).not.toHaveBeenCalled();
      expect(mockFixture.start).not.toHaveBeenCalled();
      expect(mockMockServer.start).not.toHaveBeenCalled();
      expect(mockSeeding.initialize).not.toHaveBeenCalled();
    });

    it('starts watch mode in prod context', async () => {
      const mockBuildWithWatch = {
        build: jest.fn().mockResolvedValue({
          success: true,
          extensionPath: '/path/app',
          durationMs: 5000,
        }),
        startWatchMode: jest
          .fn()
          .mockResolvedValue({ port: 8081, logFile: 'metro.log' }),
        isBuilt: jest.fn().mockResolvedValue(true),
        getExtensionPath: jest.fn().mockReturnValue('/path/app'),
        isWatching: jest.fn().mockReturnValue(false),
      } as unknown as jest.Mocked<BuildCapability>;

      sessionManager.setWorkflowContext({
        build: mockBuildWithWatch,
        stateSnapshot: mockStateSnapshot,
        config: {
          extensionName: 'MetaMask',
          toolPrefix: 'mm',
          environment: 'prod',
          defaultChainId: 1,
        },
      } as unknown as WorkflowContext);

      const launchInput: SessionLaunchInput = {
        autoBuild: false,
        appBundlePath: '/path/app',
        useWatchMode: true,
      };

      await sessionManager.launch(launchInput);

      expect(mockBuildWithWatch.startWatchMode).toHaveBeenCalled();
    });
  });
});
