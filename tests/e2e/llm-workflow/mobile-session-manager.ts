import type { Page, BrowserContext } from '@playwright/test';
import {
  type ISessionManager,
  type TrackedPage,
  type SessionLaunchInput,
  type SessionLaunchResult,
  type SessionScreenshotOptions,
  type SessionMetadata,
  type IPlatformDriver,
  type ScreenshotResult,
  type ExtensionState,
  type BuildCapability,
  type FixtureCapability,
  type ChainCapability,
  type ContractSeedingCapability,
  type StateSnapshotCapability,
  type WorkflowContext,
  type EnvironmentMode,
  type SessionState,
  type TabRole,
  MobilePlatformDriver,
  generateSessionId,
  ErrorCodes,
} from '@metamask/client-mcp-core';
import { type DeviceBackend, createLazyBackend } from '@metamask/device-mcp';

const DEFAULT_BUNDLE_ID = 'io.metamask';

/**
 * Mobile session manager for MetaMask Mobile.
 *
 * Implements ISessionManager by wrapping DeviceBackend from @metamask/device-mcp
 * behind MobilePlatformDriver. Provides the same session lifecycle as the
 * browser-based extension session manager, but drives a mobile simulator/emulator
 * instead of Chromium.
 *
 * Browser-only methods (getPage, getContext, navigation, etc.) throw with
 * MM_TOOL_NOT_SUPPORTED_ON_PLATFORM — they have no mobile equivalent.
 */
export class MobileSessionManager implements ISessionManager {
  #platformDriver: MobilePlatformDriver | undefined;

  #backend: DeviceBackend | undefined;

  #sessionState: SessionState | undefined;

  #sessionMetadata: SessionMetadata | undefined;

  #refMap: Map<string, string> = new Map();

  #workflowContext: WorkflowContext | undefined;

  #bundleId: string;

  constructor(bundleId: string = DEFAULT_BUNDLE_ID) {
    this.#bundleId = bundleId;
  }

  // ---------------------------------------------------------------------------
  // Session Lifecycle
  // ---------------------------------------------------------------------------

  hasActiveSession(): boolean {
    return this.#platformDriver !== undefined;
  }

  getSessionId(): string | undefined {
    return this.#sessionState?.sessionId;
  }

  getSessionState(): SessionState | undefined {
    return this.#sessionState;
  }

  getSessionMetadata(): SessionMetadata | undefined {
    return this.#sessionMetadata;
  }

  async launch(input: SessionLaunchInput): Promise<SessionLaunchResult> {
    if (this.hasActiveSession()) {
      const error = new Error('Session already active');
      (error as Error & { code: string }).code =
        ErrorCodes.MM_SESSION_ALREADY_RUNNING;
      throw error;
    }

    const platform = input.platform ?? 'ios';
    if (platform === 'browser') {
      const error = new Error(
        'MobileSessionManager does not support browser platform. Use the extension session manager.',
      );
      (error as Error & { code: string }).code = ErrorCodes.MM_INVALID_INPUT;
      throw error;
    }

    const backend = createLazyBackend(input.deviceId, platform);
    const bundleId = this.#bundleId;
    const platformDriver = new MobilePlatformDriver(backend, bundleId);

    await backend.openApp(bundleId);

    this.#backend = backend;
    this.#platformDriver = platformDriver;

    const sessionId = generateSessionId('mm-mobile');
    const now = new Date().toISOString();

    this.#sessionState = {
      sessionId,
      extensionId: bundleId,
      startedAt: now,
      ports: { anvil: 0, fixtureServer: 0 },
      stateMode: input.stateMode ?? 'default',
    };

    this.#sessionMetadata = {
      schemaVersion: 1,
      sessionId,
      createdAt: now,
      goal: input.goal,
      flowTags: input.flowTags ?? [],
      tags: input.tags ?? [],
      launch: {
        stateMode: input.stateMode ?? 'default',
        fixturePreset: input.fixturePreset ?? null,
      },
    };

    const state = await platformDriver.getAppState();

    return {
      sessionId,
      extensionId: bundleId,
      state,
    };
  }

  async cleanup(): Promise<boolean> {
    if (!this.hasActiveSession()) {
      return false;
    }

    try {
      if (this.#backend) {
        await this.#backend.closeApp(this.#bundleId);
      }
    } finally {
      this.#platformDriver = undefined;
      this.#backend = undefined;
      this.#sessionState = undefined;
      this.#sessionMetadata = undefined;
      this.#refMap.clear();
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Page Management (browser-only — throws on mobile)
  // ---------------------------------------------------------------------------

  getPage(): Page {
    throw this.#unsupported('getPage');
  }

  setActivePage(_page: Page): void {
    throw this.#unsupported('setActivePage');
  }

  getTrackedPages(): TrackedPage[] {
    return [];
  }

  classifyPageRole(_page: Page, _extensionId?: string): TabRole {
    return 'other';
  }

  getContext(): BrowserContext {
    throw this.#unsupported('getContext');
  }

  // ---------------------------------------------------------------------------
  // Extension State
  // ---------------------------------------------------------------------------

  async getExtensionState(): Promise<ExtensionState> {
    return this.#requireDriver().getAppState();
  }

  // ---------------------------------------------------------------------------
  // A11y Reference Map
  // ---------------------------------------------------------------------------

  setRefMap(map: Map<string, string>): void {
    this.#refMap = map;
  }

  getRefMap(): Map<string, string> {
    return this.#refMap;
  }

  clearRefMap(): void {
    this.#refMap.clear();
  }

  resolveA11yRef(ref: string): string | undefined {
    return this.#refMap.get(ref);
  }

  // ---------------------------------------------------------------------------
  // Navigation (browser-only — throws on mobile)
  // ---------------------------------------------------------------------------

  async navigateToHome(): Promise<void> {
    throw this.#unsupported('navigateToHome');
  }

  async navigateToSettings(): Promise<void> {
    throw this.#unsupported('navigateToSettings');
  }

  async navigateToUrl(_url: string): Promise<Page> {
    throw this.#unsupported('navigateToUrl');
  }

  async navigateToNotification(): Promise<Page> {
    throw this.#unsupported('navigateToNotification');
  }

  async waitForNotificationPage(_timeoutMs: number): Promise<Page> {
    throw this.#unsupported('waitForNotificationPage');
  }

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  async screenshot(
    options: SessionScreenshotOptions,
  ): Promise<ScreenshotResult> {
    return this.#requireDriver().screenshot({
      name: options.name,
      fullPage: options.fullPage,
      selector: options.selector,
    });
  }

  // ---------------------------------------------------------------------------
  // Capabilities — all return undefined (no fixture/chain/seeding for mobile yet)
  // ---------------------------------------------------------------------------

  getBuildCapability(): BuildCapability | undefined {
    return undefined;
  }

  getFixtureCapability(): FixtureCapability | undefined {
    return undefined;
  }

  getChainCapability(): ChainCapability | undefined {
    return undefined;
  }

  getContractSeedingCapability(): ContractSeedingCapability | undefined {
    return undefined;
  }

  getStateSnapshotCapability(): StateSnapshotCapability | undefined {
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Environment Configuration
  // ---------------------------------------------------------------------------

  setWorkflowContext(context: WorkflowContext): void {
    this.#workflowContext = context;
  }

  getEnvironmentMode(): EnvironmentMode {
    return this.#workflowContext?.config?.environment ?? 'e2e';
  }

  setContext(
    _context: 'e2e' | 'prod',
    _options?: Record<string, unknown>,
  ): void {
    if (this.hasActiveSession()) {
      const error = new Error('Cannot switch context while session is active');
      (error as Error & { code: string }).code =
        ErrorCodes.MM_CONTEXT_SWITCH_BLOCKED;
      throw error;
    }
  }

  getContextInfo(): {
    currentContext: 'e2e' | 'prod';
    hasActiveSession: boolean;
    sessionId: string | null;
    capabilities: { available: string[] };
    canSwitchContext: boolean;
  } {
    return {
      currentContext: this.getEnvironmentMode(),
      hasActiveSession: this.hasActiveSession(),
      sessionId: this.#sessionState?.sessionId ?? null,
      capabilities: { available: [] },
      canSwitchContext: !this.hasActiveSession(),
    };
  }

  // ---------------------------------------------------------------------------
  // Platform Driver
  // ---------------------------------------------------------------------------

  getPlatformDriver(): IPlatformDriver | undefined {
    return this.#platformDriver;
  }

  setPlatformDriver(newDriver: IPlatformDriver): void {
    this.#platformDriver = newDriver as MobilePlatformDriver;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  #requireDriver(): MobilePlatformDriver {
    const currentDriver = this.#platformDriver;
    if (!currentDriver) {
      const error = new Error('No active session');
      (error as Error & { code: string }).code =
        ErrorCodes.MM_NO_ACTIVE_SESSION;
      throw error;
    }
    return currentDriver;
  }

  #unsupported(method: string): Error {
    const error = new Error(
      `${method}() is not supported on mobile. Use platform driver methods instead.`,
    );
    (error as Error & { code: string }).code =
      'MM_TOOL_NOT_SUPPORTED_ON_PLATFORM';
    return error;
  }
}
