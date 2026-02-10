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

import {
  launchMetaMaskMobile,
  type MetaMaskMobileAppLauncher,
} from '../app-launcher';
import { createMetaMaskMobileE2EContext } from '../capabilities/factory';

const DEFAULT_ANVIL_PORT = 8545;
const DEFAULT_FIXTURE_SERVER_PORT = 12345;

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

    // ---- Step 1: Build app if autoBuild ----
    let appBundlePath = input.appBundlePath ?? input.extensionPath;
    if (autoBuild) {
      const buildCapability = this.getBuildCapability();
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
      const anvilPort = input.ports?.anvil ?? DEFAULT_ANVIL_PORT;
      if (chainCapability.setPort) {
        chainCapability.setPort(anvilPort);
      }
      await chainCapability.start();
    }

    // ---- Step 3: Start fixture server ----
    const fixtureCapability = this.getFixtureCapability();
    if (fixtureCapability) {
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
      await mockServerCapability.start();
    }

    // ---- Step 5: Initialize contract seeding ----
    const contractSeedingCapability = this.getContractSeedingCapability();
    if (contractSeedingCapability) {
      contractSeedingCapability.initialize();

      // ---- Step 6: Deploy pre-seeded contracts ----
      if (input.seedContracts?.length) {
        await contractSeedingCapability.deployContracts(input.seedContracts);
      }
    } else if (input.seedContracts?.length) {
      throw new Error(
        'seedContracts provided but ContractSeedingCapability is not available.',
      );
    }

    // ---- Step 7: Launch app via AppLauncher ----
    const launcher = await launchMetaMaskMobile({
      simulatorDeviceId: input.simulatorDeviceId,
      appBundlePath,
      anvilPort: input.ports?.anvil ?? DEFAULT_ANVIL_PORT,
      fixtureServerPort:
        input.ports?.fixtureServer ?? DEFAULT_FIXTURE_SERVER_PORT,
      stateMode,
    });

    // ---- Step 8: Capture initial state ----
    const stateSnapshot = this.getStateSnapshotCapability();
    let extensionState: ExtensionState;
    if (stateSnapshot) {
      // Page param is ignored on iOS — pass undefined cast to Page
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
          anvil: input.ports?.anvil ?? DEFAULT_ANVIL_PORT,
          fixtureServer:
            input.ports?.fixtureServer ?? DEFAULT_FIXTURE_SERVER_PORT,
        },
        stateMode,
      },
      launcher,
    };

    // ---- Step 9: Write session metadata to knowledge store ----
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
          anvil: input.ports?.anvil ?? DEFAULT_ANVIL_PORT,
          fixtureServer:
            input.ports?.fixtureServer ?? DEFAULT_FIXTURE_SERVER_PORT,
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
  }

  async cleanup(): Promise<boolean> {
    if (!this.activeSession) {
      return false;
    }

    const cleanupErrors: Error[] = [];

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

    // Step 5: Clear session state
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
      const newContext = createMetaMaskMobileE2EContext();
      this.setWorkflowContext(newContext);
    } else {
      // Prod mode: minimal context with no testing capabilities
      this.setWorkflowContext({
        config: {
          extensionName: 'MetaMask',
          toolPrefix: 'mm',
          environment: 'prod',
        },
      });
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
      return { data: fixture, meta: undefined };
    }

    // Default state
    return fixtureCapability.getDefaultState();
  }
}

export const metaMaskMobileSessionManager = new MetaMaskMobileSessionManager();
