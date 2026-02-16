/* eslint-disable import/no-nodejs-modules */
import crypto from 'crypto';
/* eslint-enable import/no-nodejs-modules */

import {
  type ISessionManager,
  type TrackedPage,
  type SessionLaunchInput,
  type SessionLaunchResult,
  type SessionScreenshotOptions,
  type TabRole,
  type SessionState,
  type SessionMetadata,
  type ScreenshotResult,
  type BuildCapability,
  type FixtureCapability,
  type ChainCapability,
  type ContractSeedingCapability,
  type StateSnapshotCapability,
  type ExtensionState,
  type WorkflowContext,
  type EnvironmentMode,
  type MockServerCapability,
  ErrorCodes,
  knowledgeStore,
  getPlatformDriver,
} from '@metamask/client-mcp-core';

// ISessionManager uses Playwright Page/BrowserContext in its signatures.
// On iOS these methods throw — we only need the types for interface conformance.
// Re-derive them from the interface to avoid Playwright version mismatches.
type PageFromInterface = ReturnType<ISessionManager['getPage']>;
type BrowserContextFromInterface = ReturnType<ISessionManager['getContext']>;

type BuildCapabilityWithWatch = BuildCapability & {
  startWatchMode?: (options?: {
    port?: number;
    clean?: boolean;
    logFile?: string;
  }) => Promise<{ port: number; logFile?: string; pid?: number }>;
  stopWatchMode?: () => Promise<void>;
  isWatching?: () => boolean;
};

import {
  launchMetaMaskMobile,
  type MetaMaskMobileAppLauncher,
} from '../app-launcher';
import {
  createMetaMaskMobileE2EContext,
  createMetaMaskMobileProdContext,
} from '../capabilities/factory';

const DEFAULT_ANVIL_PORT = 8545;
const DEFAULT_FIXTURE_SERVER_PORT = 12345;
const DEFAULT_MOCK_SERVER_PORT = 8000;

/**
 * MetaMask Mobile Session Manager
 *
 * Implements the ISessionManager interface from @metamask/client-mcp-core,
 * adapted for iOS simulator testing. Coordinates all 6 capabilities
 * (build, fixture, chain, seeding, state-snapshot, mock-server) and the
 * MetaMaskMobileAppLauncher to manage the full session lifecycle.
 *
 * Key differences from the browser extension session manager:
 * - Playwright Page/BrowserContext methods throw "Not supported on iOS platform"
 * - Navigation uses deep links or IOSPlatformDriver instead of Playwright
 * - Screenshots forwarded to IOSPlatformDriver
 * - No tab management (single-app model on iOS)
 */
export class MetaMaskMobileSessionManager implements ISessionManager {
  private activeSession: {
    state: SessionState;
    launcher: MetaMaskMobileAppLauncher;
  } | null = null;

  private refMap: Map<string, string> = new Map();

  private workflowContext: WorkflowContext | undefined;

  private sessionMetadata: SessionMetadata | undefined;

  // ---------------------------------------------------------------------------
  // Workflow Context
  // ---------------------------------------------------------------------------

  setWorkflowContext(context: WorkflowContext): void {
    this.workflowContext = context;
  }

  getWorkflowContext(): WorkflowContext | undefined {
    return this.workflowContext;
  }

  // ---------------------------------------------------------------------------
  // Session Lifecycle
  // ---------------------------------------------------------------------------

  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }

  getSessionId(): string | undefined {
    return this.activeSession?.state.sessionId;
  }

  getSessionState(): SessionState | undefined {
    return this.activeSession?.state;
  }

  getSessionMetadata(): SessionMetadata | undefined {
    return this.sessionMetadata;
  }

  async launch(input: SessionLaunchInput): Promise<SessionLaunchResult> {
    if (this.activeSession) {
      throw new Error(ErrorCodes.MM_SESSION_ALREADY_RUNNING);
    }

    const sessionId = `mm-ios-${crypto.randomUUID()}`;
    const stateMode = input.stateMode ?? 'default';
    const autoBuild = input.autoBuild ?? true;

    // Resolve ports upfront — these are the actual ports services will bind to
    const anvilPort = input.ports?.anvil ?? DEFAULT_ANVIL_PORT;
    const fixtureServerPort =
      input.ports?.fixtureServer ?? DEFAULT_FIXTURE_SERVER_PORT;
    const mockServerPort = DEFAULT_MOCK_SERVER_PORT;

    let launcher: MetaMaskMobileAppLauncher | null = null;

    try {
      // ---- Step 1: Build or Watch Mode ----
      let appBundlePath = input.appBundlePath ?? input.extensionPath;
      const useWatchMode = input.useWatchMode ?? false;
      const watchModePort = input.watchModePort;
      let watchModeResult: { port: number; logFile?: string } | undefined;

      if (useWatchMode) {
        const buildCapability = this.getBuildCapability() as
          | BuildCapabilityWithWatch
          | undefined;
        if (!buildCapability?.startWatchMode) {
          throw new Error(
            'useWatchMode is enabled but BuildCapability does not support watch mode.\n\n' +
              'Ensure the BuildCapability implementation provides startWatchMode().',
          );
        }

        const isBuilt = await buildCapability.isBuilt();
        if (!isBuilt && !appBundlePath) {
          throw new Error(
            'useWatchMode requires the app to already be built.\n\n' +
              'Options:\n' +
              '  1. Run mm_build first to build the native app\n' +
              '  2. Provide appBundlePath to a pre-built .app bundle\n' +
              '  3. Set useWatchMode: false for a full native rebuild',
          );
        }

        if (!appBundlePath) {
          appBundlePath = buildCapability.getExtensionPath();
        }

        const result = await buildCapability.startWatchMode({
          port: watchModePort ?? 8081,
          clean: false,
          logFile: undefined,
        });
        watchModeResult = { port: result.port, logFile: result.logFile };
      } else if (autoBuild) {
        const buildCapability = this.getBuildCapability() as
          | BuildCapabilityWithWatch
          | undefined;
        if (!buildCapability) {
          throw new Error(
            'autoBuild is enabled but BuildCapability is not available.\n\n' +
              'Options:\n' +
              '  1. Use mm_build tool first to build the app\n' +
              '  2. Set autoBuild: false and provide appBundlePath\n' +
              '  3. Ensure BuildCapability is registered in the workflow context',
          );
        }

        const buildResult = await buildCapability.build({ force: false });
        if (!buildResult.success) {
          throw new Error(
            `Build failed: ${buildResult.error ?? 'Unknown error'}\n\n` +
              'Use mm_build tool to diagnose build issues.',
          );
        }

        if (!appBundlePath && buildResult.extensionPath) {
          appBundlePath = buildResult.extensionPath;
        }
      }

      // ---- Step 2: Start chain ----
      const chainCapability = this.getChainCapability();
      if (chainCapability) {
        chainCapability.setPort(anvilPort);
        await chainCapability.start();
      }

      // ---- Step 3: Start fixture server ----
      const fixtureCapability = this.getFixtureCapability();
      if (fixtureCapability) {
        const fixtureWithPort =
          fixtureCapability as typeof fixtureCapability & {
            setPort?: (port: number) => void;
          };
        fixtureWithPort.setPort?.(fixtureServerPort);

        const fixtureState = this.resolveFixtureState(fixtureCapability, {
          stateMode,
          fixturePreset: input.fixturePreset,
          fixture: input.fixture,
        });
        await fixtureCapability.start(fixtureState);
      }

      // ---- Step 4: Start mock server ----
      const mockServerCapability = this.getMockServerCapability();
      if (mockServerCapability) {
        const mockWithPort =
          mockServerCapability as typeof mockServerCapability & {
            setPort?: (port: number) => void;
          };
        mockWithPort.setPort?.(mockServerPort);
        await mockServerCapability.start();
      }

      // ---- Step 5: Initialize contract seeding ----
      const contractSeedingCapability = this.getContractSeedingCapability();
      if (contractSeedingCapability) {
        contractSeedingCapability.initialize();

        if (input.seedContracts?.length) {
          await contractSeedingCapability.deployContracts(input.seedContracts);
        }
      } else if (input.seedContracts?.length) {
        throw new Error(
          'seedContracts provided but ContractSeedingCapability is not available.',
        );
      }

      // ---- Step 6: Launch app via AppLauncher ----
      launcher = await launchMetaMaskMobile({
        simulatorDeviceId: input.simulatorDeviceId,
        appBundlePath,
        anvilPort,
        fixtureServerPort,
        stateMode,
        metroPort: watchModeResult?.port ?? watchModePort,
      });

      // ---- Step 7: Capture initial state ----
      const stateSnapshot = this.getStateSnapshotCapability();
      let extensionState: ExtensionState;
      if (stateSnapshot) {
        extensionState = await stateSnapshot.getState(
          undefined as unknown as PageFromInterface,
          {
            extensionId: 'ios-app',
            chainId: this.workflowContext?.config?.defaultChainId ?? 1337,
          },
        );
      } else {
        extensionState = {
          isLoaded: true,
          currentUrl: '',
          extensionId: 'ios-app',
          isUnlocked: false,
          currentScreen: 'unknown',
          accountAddress: null,
          networkName: null,
          chainId: null,
          balance: null,
        };
      }

      const startedAt = new Date().toISOString();

      this.activeSession = {
        state: {
          sessionId,
          extensionId: 'ios-app',
          startedAt,
          ports: {
            anvil: anvilPort,
            fixtureServer: fixtureServerPort,
          },
          stateMode,
          watchModePort: watchModeResult?.port,
        },
        launcher,
      };

      // ---- Step 8: Write session metadata to knowledge store ----
      const metadata: SessionMetadata = {
        schemaVersion: 1,
        sessionId,
        createdAt: startedAt,
        goal: input.goal,
        flowTags: input.flowTags ?? [],
        tags: input.tags ?? [],
        build: {
          buildType: 'build:test',
          extensionPathResolved: appBundlePath,
        },
        launch: {
          stateMode,
          fixturePreset: input.fixturePreset ?? null,
          extensionPath: appBundlePath,
          ports: {
            anvil: anvilPort,
            fixtureServer: fixtureServerPort,
          },
        },
      };

      try {
        await knowledgeStore.writeSessionMetadata(metadata);
      } catch (e) {
        console.warn('Failed to write session metadata:', e);
      }
      this.sessionMetadata = metadata;

      return {
        sessionId,
        extensionId: 'ios-app',
        state: extensionState,
      };
    } catch (error) {
      // Best-effort teardown of any subsystems that started
      await this.teardownStartedServices(launcher);
      throw error;
    }
  }

  private async teardownStartedServices(
    launcher: MetaMaskMobileAppLauncher | null,
  ): Promise<void> {
    try {
      const build = this.getBuildCapability() as
        | BuildCapabilityWithWatch
        | undefined;
      if (build?.isWatching?.()) {
        await build.stopWatchMode?.();
      }
    } catch (e) {
      console.warn('Teardown: failed to stop watch mode:', e);
    }
    if (launcher) {
      try {
        await launcher.stop();
      } catch (e) {
        console.warn('Teardown: failed to stop launcher:', e);
      }
    }
    try {
      const mock = this.getMockServerCapability();
      if (mock) await mock.stop();
    } catch (e) {
      console.warn('Teardown: failed to stop mock server:', e);
    }
    try {
      const fixture = this.getFixtureCapability();
      if (fixture) await fixture.stop();
    } catch (e) {
      console.warn('Teardown: failed to stop fixture server:', e);
    }
    try {
      const chain = this.getChainCapability();
      if (chain) await chain.stop();
    } catch (e) {
      console.warn('Teardown: failed to stop chain:', e);
    }
  }

  async cleanup(): Promise<boolean> {
    if (!this.activeSession) {
      return false;
    }

    const cleanupErrors: Error[] = [];

    // Step 0: Stop watch mode (Metro bundler) if running
    try {
      const buildCapability = this.getBuildCapability() as
        | BuildCapabilityWithWatch
        | undefined;
      if (buildCapability?.isWatching?.()) {
        await buildCapability.stopWatchMode?.();
      }
    } catch (e) {
      console.warn('Failed to stop watch mode:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 1: Stop app via AppLauncher
    try {
      await this.activeSession.launcher.stop();
    } catch (e) {
      console.warn('Failed to stop app launcher:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 2: Stop mock server
    try {
      const mockServerCapability = this.getMockServerCapability();
      if (mockServerCapability) {
        await mockServerCapability.stop();
      }
    } catch (e) {
      console.warn('Failed to stop mock server:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 3: Stop fixture server
    try {
      const fixtureCapability = this.getFixtureCapability();
      if (fixtureCapability) {
        await fixtureCapability.stop();
      }
    } catch (e) {
      console.warn('Failed to stop fixture server:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 4: Stop chain
    try {
      const chainCapability = this.getChainCapability();
      if (chainCapability) {
        await chainCapability.stop();
      }
    } catch (e) {
      console.warn('Failed to stop chain:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 5: Clear contract seeding registry
    try {
      const contractSeeding = this.getContractSeedingCapability();
      if (contractSeeding) {
        contractSeeding.clearRegistry();
      }
    } catch (e) {
      console.warn('Failed to clear contract registry:', e);
      cleanupErrors.push(e instanceof Error ? e : new Error(String(e)));
    }

    // Step 6: Clear session state
    this.activeSession = null;
    this.sessionMetadata = undefined;
    this.clearRefMap();

    if (cleanupErrors.length > 0) {
      const errorMessages = cleanupErrors
        .map((err, i) => `${i + 1}. ${err.message}`)
        .join('\n');
      console.warn(
        `Session cleanup completed with ${cleanupErrors.length} error(s):\n${errorMessages}`,
      );
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Page Management (STUBS — not supported on iOS)
  // ---------------------------------------------------------------------------

  getPage(): PageFromInterface {
    throw new Error('Not supported on iOS platform');
  }

  setActivePage(_page: PageFromInterface): void {
    throw new Error('Not supported on iOS platform');
  }

  getTrackedPages(): TrackedPage[] {
    return [];
  }

  classifyPageRole(_page: PageFromInterface, _extensionId?: string): TabRole {
    return 'extension';
  }

  getContext(): BrowserContextFromInterface {
    throw new Error('Not supported on iOS platform');
  }

  // ---------------------------------------------------------------------------
  // Extension State
  // ---------------------------------------------------------------------------

  async getExtensionState(): Promise<ExtensionState> {
    if (!this.activeSession) {
      throw new Error(ErrorCodes.MM_NO_ACTIVE_SESSION);
    }

    const stateSnapshot = this.getStateSnapshotCapability();
    if (!stateSnapshot) {
      throw new Error('StateSnapshotCapability is not available.');
    }

    const chainId = this.workflowContext?.config?.defaultChainId ?? 1337;
    return stateSnapshot.getState(undefined as unknown as PageFromInterface, {
      extensionId: 'ios-app',
      chainId,
    });
  }

  // ---------------------------------------------------------------------------
  // A11y Reference Map
  // ---------------------------------------------------------------------------

  setRefMap(map: Map<string, string>): void {
    this.refMap = map;
  }

  getRefMap(): Map<string, string> {
    return this.refMap;
  }

  clearRefMap(): void {
    this.refMap.clear();
  }

  resolveA11yRef(ref: string): string | undefined {
    return this.refMap.get(ref);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async navigateToHome(): Promise<void> {
    if (!this.activeSession) {
      throw new Error(ErrorCodes.MM_NO_ACTIVE_SESSION);
    }

    const platformDriver = getPlatformDriver();
    if (!platformDriver) {
      throw new Error(
        'Platform driver not available. App may not be launched.',
      );
    }

    // On iOS, use the tab bar "Wallet" button to navigate home
    await platformDriver.click(
      'testId',
      'tab-bar-item-Wallet',
      this.refMap,
      5000,
    );
  }

  async navigateToSettings(): Promise<void> {
    if (!this.activeSession) {
      throw new Error(ErrorCodes.MM_NO_ACTIVE_SESSION);
    }

    const platformDriver = getPlatformDriver();
    if (!platformDriver) {
      throw new Error(
        'Platform driver not available. App may not be launched.',
      );
    }

    // On iOS, use the tab bar "Settings" button to navigate to settings
    await platformDriver.click(
      'testId',
      'tab-bar-item-Setting',
      this.refMap,
      5000,
    );
  }

  async navigateToUrl(_url: string): Promise<PageFromInterface> {
    throw new Error(
      'Not supported on iOS platform. Mobile does not have browser tabs.',
    );
  }

  async navigateToNotification(): Promise<PageFromInterface> {
    throw new Error(
      'Not supported on iOS platform. Mobile does not have notification popups.',
    );
  }

  async waitForNotificationPage(
    _timeoutMs: number,
  ): Promise<PageFromInterface> {
    throw new Error(
      'Not supported on iOS platform. Mobile does not have notification popups.',
    );
  }

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  async screenshot(
    options: SessionScreenshotOptions,
  ): Promise<ScreenshotResult> {
    if (!this.activeSession) {
      throw new Error(ErrorCodes.MM_NO_ACTIVE_SESSION);
    }

    const platformDriver = getPlatformDriver();
    if (!platformDriver) {
      throw new Error(
        'Platform driver not available. App may not be launched.',
      );
    }

    return platformDriver.screenshot({
      name: options.name,
      fullPage: options.fullPage,
    });
  }

  // ---------------------------------------------------------------------------
  // Capabilities
  // ---------------------------------------------------------------------------

  getBuildCapability(): BuildCapability | undefined {
    return this.workflowContext?.build;
  }

  getFixtureCapability(): FixtureCapability | undefined {
    return this.workflowContext?.fixture;
  }

  getChainCapability(): ChainCapability | undefined {
    return this.workflowContext?.chain;
  }

  getContractSeedingCapability(): ContractSeedingCapability | undefined {
    return this.workflowContext?.contractSeeding;
  }

  getStateSnapshotCapability(): StateSnapshotCapability | undefined {
    return this.workflowContext?.stateSnapshot;
  }

  private getMockServerCapability(): MockServerCapability | undefined {
    return this.workflowContext?.mockServer;
  }

  // ---------------------------------------------------------------------------
  // Environment Configuration
  // ---------------------------------------------------------------------------

  getEnvironmentMode(): EnvironmentMode {
    return this.workflowContext?.config?.environment ?? 'e2e';
  }

  setContext(context: 'e2e' | 'prod'): void {
    if (this.hasActiveSession()) {
      throw new Error(
        `${ErrorCodes.MM_CONTEXT_SWITCH_BLOCKED}: Cannot switch context while session is active. ` +
          `Current session: ${this.getSessionId()}. Call mm_cleanup first.`,
      );
    }

    const currentContext = this.getEnvironmentMode();
    if (currentContext === context) {
      return;
    }

    if (context === 'e2e') {
      this.setWorkflowContext(createMetaMaskMobileE2EContext());
    } else {
      this.setWorkflowContext(createMetaMaskMobileProdContext());
    }
  }

  getContextInfo(): {
    currentContext: 'e2e' | 'prod';
    hasActiveSession: boolean;
    sessionId: string | null;
    capabilities: { available: string[] };
    canSwitchContext: boolean;
  } {
    const context = this.getEnvironmentMode();
    const hasSession = this.hasActiveSession();

    const availableCapabilities: string[] = [];
    if (this.getBuildCapability()) {
      availableCapabilities.push('build');
    }
    if (this.getFixtureCapability()) {
      availableCapabilities.push('fixture');
    }
    if (this.getChainCapability()) {
      availableCapabilities.push('chain');
    }
    if (this.getContractSeedingCapability()) {
      availableCapabilities.push('contractSeeding');
    }
    if (this.getStateSnapshotCapability()) {
      availableCapabilities.push('stateSnapshot');
    }
    if (this.getMockServerCapability()) {
      availableCapabilities.push('mockServer');
    }

    return {
      currentContext: context,
      hasActiveSession: hasSession,
      sessionId: this.getSessionId() ?? null,
      capabilities: { available: availableCapabilities },
      canSwitchContext: !hasSession,
    };
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve fixture state based on state mode and optional preset/custom fixture.
   */
  private resolveFixtureState(
    fixtureCapability: FixtureCapability,
    options: {
      stateMode: string;
      fixturePreset?: string;
      fixture?: Record<string, unknown>;
    },
  ): ReturnType<FixtureCapability['getDefaultState']> {
    const { stateMode, fixturePreset, fixture } = options;

    if (stateMode === 'onboarding') {
      return fixtureCapability.getOnboardingState();
    }

    if (stateMode === 'custom' && fixturePreset) {
      return fixtureCapability.resolvePreset(fixturePreset);
    }

    if (stateMode === 'custom' && fixture) {
      return { data: fixture };
    }

    // Default state
    return fixtureCapability.getDefaultState();
  }
}
