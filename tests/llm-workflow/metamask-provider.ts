/* eslint-disable import-x/no-extraneous-dependencies, import-x/no-nodejs-modules */
import { randomUUID } from 'node:crypto';

import type { BrowserContext, Page } from '@playwright/test';
import {
  type BuildCapability,
  type ChainCapability,
  type ContractSeedingCapability,
  type EnvironmentMode,
  type ExtensionState,
  type FixtureCapability,
  type IPlatformDriver,
  type ISessionManager,
  type ScreenshotResult,
  type SessionLaunchInput,
  type SessionLaunchResult,
  type SessionMetadata,
  type SessionScreenshotOptions,
  type SessionState,
  type StateSnapshotCapability,
  type TabRole,
  type TrackedPage,
  type WorkflowContext,
} from '@metamask/client-mcp-core';

import { AndroidPlatformAdapter } from './android/platform-adapter';
import { IOSPlatformAdapter } from './ios/platform-adapter';
import {
  AndroidLaunchError,
  IOSLaunchError,
  MobileLaunchError,
} from './launcher-types';
import type {
  MobilePlatform,
  MobilePlatformAdapter,
  ResolvedMobileLaunchOptions,
} from './platform-adapter';
import { appendLog } from './utils';

interface MobileSessionManagerDependencies {
  createIOSAdapter: () => MobilePlatformAdapter;
  createAndroidAdapter: () => MobilePlatformAdapter;
}

const MOBILE_PAGE_UNAVAILABLE =
  'Playwright Page/BrowserContext is not available on mobile sessions.';

export class MetaMaskMobileSessionManager implements ISessionManager {
  private readonly dependencies: MobileSessionManagerDependencies;

  private refMap: Map<string, string> = new Map();

  private workflowContext: WorkflowContext | undefined;

  private launchInProgress = false;

  private sessionId: string | undefined;

  private sessionState: SessionState | undefined;

  private sessionMetadata: SessionMetadata | undefined;

  private platformDriver: IPlatformDriver | undefined;

  private adapter: MobilePlatformAdapter | undefined;

  private resolved: ResolvedMobileLaunchOptions | undefined;

  private activePlatform: MobilePlatform | undefined;

  constructor(dependencies?: Partial<MobileSessionManagerDependencies>) {
    this.dependencies = {
      createIOSAdapter: () => new IOSPlatformAdapter(),
      createAndroidAdapter: () => new AndroidPlatformAdapter(),
      ...dependencies,
    };
  }

  hasActiveSession(): boolean {
    return this.sessionId !== undefined;
  }

  isLaunchInProgress(): boolean {
    return this.launchInProgress;
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getSessionState(): SessionState | undefined {
    return this.sessionState;
  }

  getSessionMetadata(): SessionMetadata | undefined {
    return this.sessionMetadata;
  }

  async launch(input: SessionLaunchInput): Promise<SessionLaunchResult> {
    appendLog('MetaMask Provider Launch Started');
    const requestedPlatform = normalizePlatform(input.platform);
    this.assertLaunchAvailable(requestedPlatform);
    this.validateSharedLaunchPolicy(input, requestedPlatform);
    this.activePlatform = requestedPlatform;
    this.launchInProgress = true;

    try {
      const metroPort = this.resolveMetroPort(input.metroPort);
      const adapter = this.createAdapter(input.platform);
      this.adapter = adapter;

      const resolved = await adapter.resolve(input, metroPort);
      this.resolved = resolved;
      this.logLaunchMetadata(resolved, input.metroPort);

      const { driver: mobileDriver, state } = await adapter.launch(resolved);
      this.platformDriver = mobileDriver;

      const sessionId = randomUUID();
      const startedAt = new Date().toISOString();
      this.sessionId = sessionId;
      this.sessionState = {
        sessionId,
        extensionId: resolved.appId,
        startedAt,
        ports: { anvil: 0, fixtureServer: 0 },
        stateMode: 'default',
      };
      this.sessionMetadata = {
        schemaVersion: 1,
        sessionId,
        createdAt: startedAt,
        goal: input.goal,
        flowTags: input.flowTags ?? [],
        tags: input.tags ?? [],
        launch: {
          stateMode: 'default',
          fixturePreset: null,
          extensionPath: resolved.appPath,
          ports: undefined,
        },
      };

      return { sessionId, extensionId: resolved.appId, state };
    } catch (error) {
      const launchError = this.toLaunchError(error, requestedPlatform);
      try {
        await this.teardownPartialLaunch();
      } catch (teardownError) {
        process.stderr.write(
          `[mm-mobile] Partial launch teardown failed: ${errorMessage(teardownError)}\n`,
        );
      }
      process.stderr.write(
        `Mobile launch failed: ${this.formatLaunchErrorMessage(launchError)}\n`,
      );
      throw launchError;
    } finally {
      this.launchInProgress = false;
    }
  }

  async cleanup(): Promise<boolean> {
    if (this.launchInProgress) {
      throw this.createPlatformError(this.activePlatform ?? 'ios', {
        code: 'MM_SESSION_ALREADY_RUNNING',
        message:
          'A launch is in progress. Wait for it to complete before running `mm cleanup`.',
      });
    }
    if (!this.hasActiveSession()) {
      return false;
    }

    try {
      await this.adapter?.cleanup();
    } finally {
      this.resetSessionState();
    }
    return true;
  }

  getPlatformDriver(): IPlatformDriver | undefined {
    return this.platformDriver;
  }

  setPlatformDriver(platformDriver: IPlatformDriver): void {
    this.platformDriver = platformDriver;
  }

  getPage(): Page {
    throw this.notAvailableOnMobile();
  }

  setActivePage(_page: Page): void {
    // Browser-only: mobile sessions use MobilePlatformDriver.
  }

  getTrackedPages(): TrackedPage[] {
    return [];
  }

  classifyPageRole(_page: Page, _extensionId?: string): TabRole {
    return 'extension';
  }

  getContext(): BrowserContext {
    throw this.notAvailableOnMobile();
  }

  async getExtensionState(): Promise<ExtensionState> {
    if (!this.platformDriver) {
      throw this.noActiveMobileSession();
    }
    return this.platformDriver.getAppState();
  }

  setRefMap(map: Map<string, string>): void {
    this.refMap = new Map(map);
  }

  getRefMap(): Map<string, string> {
    return new Map(this.refMap);
  }

  clearRefMap(): void {
    this.refMap.clear();
  }

  resolveA11yRef(ref: string): string | undefined {
    return this.refMap.get(ref);
  }

  async navigateToHome(): Promise<void> {
    this.assertActiveSession();
    throw this.createPlatformError(this.activePlatform ?? 'ios', {
      code: 'MM_LAUNCH_FAILED',
      message:
        'navigateToHome() is not implemented for mobile sessions. Use describe-screen + click instead.',
    });
  }

  async navigateToSettings(): Promise<void> {
    this.assertActiveSession();
    throw this.createPlatformError(this.activePlatform ?? 'ios', {
      code: 'MM_LAUNCH_FAILED',
      message:
        'navigateToSettings() is not implemented for mobile sessions. Use describe-screen + click instead.',
    });
  }

  async navigateToUrl(_url: string): Promise<Page> {
    throw this.browserOnlyError('URL navigation');
  }

  async navigateToNotification(): Promise<Page> {
    throw this.browserOnlyError('Notification pages');
  }

  async waitForNotificationPage(_timeoutMs: number): Promise<Page> {
    throw this.browserOnlyError('Notification pages');
  }

  async screenshot(
    options: SessionScreenshotOptions,
  ): Promise<ScreenshotResult> {
    if (!this.platformDriver) {
      throw this.noActiveMobileSession();
    }
    return this.platformDriver.screenshot({
      name: options.name,
      fullPage: options.fullPage,
      selector: options.selector,
    });
  }

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
    return this.workflowContext?.stateSnapshot;
  }

  setWorkflowContext(context: WorkflowContext): void {
    this.workflowContext = context;
  }

  getEnvironmentMode(): EnvironmentMode {
    return 'prod';
  }

  setContext(
    context: 'e2e' | 'prod',
    _options?: Record<string, unknown>,
  ): void {
    if (context === 'e2e') {
      throw this.createPlatformError(this.activePlatform ?? 'ios', {
        code: 'MM_LAUNCH_FAILED',
        message:
          'MetaMask Mobile supports only the prod context. E2E launch context is not available.',
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
    return {
      currentContext: 'prod',
      hasActiveSession: this.hasActiveSession(),
      sessionId: this.sessionId ?? null,
      capabilities: { available: this.computeAvailableCapabilities() },
      canSwitchContext: false,
    };
  }

  private createAdapter(
    platform: SessionLaunchInput['platform'],
  ): MobilePlatformAdapter {
    return platform === 'android'
      ? this.dependencies.createAndroidAdapter()
      : this.dependencies.createIOSAdapter();
  }

  private assertLaunchAvailable(requestedPlatform: MobilePlatform): void {
    if (this.launchInProgress || this.hasActiveSession()) {
      throw this.createPlatformError(this.activePlatform ?? requestedPlatform, {
        code: 'MM_SESSION_ALREADY_RUNNING',
        message: this.launchInProgress
          ? 'A launch is already in progress. Wait for it to complete or run `mm cleanup` first.'
          : 'A session is already active. Run `mm cleanup` first.',
      });
    }
  }

  private validateSharedLaunchPolicy(
    input: SessionLaunchInput,
    platform: MobilePlatform,
  ): void {
    const unsupported: string[] = [];
    if (input.stateMode !== undefined && input.stateMode !== 'default') {
      unsupported.push(`stateMode='${input.stateMode}'`);
    }
    if (input.fixturePreset !== undefined) unsupported.push('fixturePreset');
    if (input.fixture !== undefined) unsupported.push('fixture');
    if (input.seedContracts?.length) unsupported.push('seedContracts');
    if (input.ports !== undefined) unsupported.push('ports');

    if (unsupported.length > 0) {
      throw this.createPlatformError(platform, {
        code: 'MM_LAUNCH_FAILED',
        message:
          'MetaMask Mobile is prod-only and operates on the already-installed wallet. ' +
          `Unsupported E2E launch option(s): ${unsupported.join(', ')}. ` +
          'State initialization, fixtures, contract seeding, and port configuration are not available in this workflow.',
      });
    }
  }

  private resolveMetroPort(inputMetroPort?: number): number | undefined {
    if (inputMetroPort !== undefined) {
      if (isValidPort(inputMetroPort)) return inputMetroPort;
      process.stderr.write(
        `[mm-mobile] Ignoring invalid metroPort=${inputMetroPort} (must be integer 1-65535).\n`,
      );
    }

    const raw = process.env.MM_METRO_PORT?.trim();
    if (!raw) return undefined;
    const port = Number(raw);
    if (isValidPort(port)) return port;
    process.stderr.write(
      `[mm-mobile] Ignoring invalid MM_METRO_PORT="${raw}" (must be integer 1-65535).\n`,
    );
    return undefined;
  }

  private computeAvailableCapabilities(): string[] {
    return this.workflowContext?.stateSnapshot ? ['stateSnapshot'] : [];
  }

  private async teardownPartialLaunch(): Promise<void> {
    try {
      await this.adapter?.cleanup();
    } finally {
      this.resetSessionState();
    }
  }

  private resetSessionState(): void {
    this.sessionId = undefined;
    this.platformDriver = undefined;
    this.adapter = undefined;
    this.resolved = undefined;
    this.activePlatform = undefined;
    this.sessionState = undefined;
    this.sessionMetadata = undefined;
    this.workflowContext = undefined;
    this.refMap.clear();
  }

  private assertActiveSession(): void {
    if (!this.hasActiveSession()) throw this.noActiveMobileSession();
  }

  private noActiveMobileSession(): MobileLaunchError {
    return this.createPlatformError(this.activePlatform ?? 'ios', {
      code: 'MM_LAUNCH_FAILED',
      message: 'No active mobile session. Run `mm launch` first.',
    });
  }

  private notAvailableOnMobile(): MobileLaunchError {
    return new MobileLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: MOBILE_PAGE_UNAVAILABLE,
    });
  }

  private browserOnlyError(feature: string): MobileLaunchError {
    return new MobileLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: `${feature} are browser-only and are not available on mobile.`,
    });
  }

  private toLaunchError(
    error: unknown,
    platform: MobilePlatform,
  ): MobileLaunchError {
    return error instanceof MobileLaunchError
      ? error
      : this.createPlatformError(platform, {
          code: 'MM_LAUNCH_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
  }

  private createPlatformError(
    platform: MobilePlatform,
    args: {
      code: 'MM_LAUNCH_FAILED' | 'MM_SESSION_ALREADY_RUNNING';
      message: string;
      remediation?: string;
    },
  ): IOSLaunchError | AndroidLaunchError {
    return platform === 'android'
      ? new AndroidLaunchError(args)
      : new IOSLaunchError(args);
  }

  private formatLaunchErrorMessage(error: MobileLaunchError): string {
    const message = `${error.code}: ${error.message}`;
    return error.remediation
      ? `${message}\nRemediation: ${error.remediation}`
      : message;
  }

  private logLaunchMetadata(
    resolved: ResolvedMobileLaunchOptions,
    inputMetroPort?: number,
  ): void {
    let metroSource = 'none';
    if (inputMetroPort !== undefined) metroSource = '--metro-port';
    else if (process.env.MM_METRO_PORT) metroSource = 'MM_METRO_PORT';

    process.stderr.write(
      [
        '[mm-mobile] context=prod',
        `[mm-mobile] platform=${resolved.platform}`,
        ...resolved.metadataLines,
        `[mm-mobile] metroPort=${resolved.metroPort ?? 'none'} source=${metroSource}`,
      ].join('\n') + '\n',
    );
  }
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function normalizePlatform(
  platform: SessionLaunchInput['platform'],
): MobilePlatform {
  return platform === 'android' ? 'android' : 'ios';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
