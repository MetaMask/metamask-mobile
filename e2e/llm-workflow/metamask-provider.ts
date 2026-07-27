/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import { execFileSync } from 'node:child_process';
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
  type WalletState,
  type WorkflowContext,
} from '@metamask/client-mcp-core';

import type { DeviceBackend } from '@metamask/device-mcp';

import {
  createIOSPlatformDriver,
  type CreatedIOSDriver,
} from './ios/platform-driver-factory';
import { attachToMetroWatchMode } from './ios/metro-watch-attach';
import { validateIOSPrerequisites } from './ios/prerequisites';
import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from './launcher-types';
import { rewritePortsInWalletState } from './capabilities/fixture-adapter';
import type { MetaMaskMobileChainCapability } from './capabilities/chain';
import type { MetaMaskMobileMockServerCapability } from './capabilities/mock-server';
import { appendLog } from './utils';

export interface MobileLaunchInput extends SessionLaunchInput {
  simulatorDeviceId?: string;
  appBundlePath?: string;
  metroPort?: number;
  reinstall?: boolean;
  resetAppData?: boolean;
  allowFoxCodeMismatch?: boolean;
}

const IOS_PAGE_UNAVAILABLE =
  'Playwright Page/BrowserContext is not available on iOS sessions.';

export class MetaMaskMobileSessionManager implements ISessionManager {
  private refMap: Map<string, string> = new Map();

  private workflowContext: WorkflowContext | undefined;

  private launchInProgress = false;

  private sessionId: string | undefined;

  private sessionState: SessionState | undefined;

  private sessionMetadata: SessionMetadata | undefined;

  private platformDriver: IPlatformDriver | undefined;

  private iosDriver: CreatedIOSDriver | undefined;

  private resolved: ResolvedIOSLaunchOptions | undefined;

  private currentContext: 'e2e' | 'prod' = 'prod';

  private e2eContext: WorkflowContext | undefined;

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

  async launch(input: MobileLaunchInput): Promise<SessionLaunchResult> {
    appendLog('MetaMask Provider Launch Started');
    if (this.launchInProgress) {
      throw new IOSLaunchError({
        code: 'MM_SESSION_ALREADY_RUNNING',
        message:
          'A launch is already in progress. Wait for it to complete or run `mm cleanup` first.',
      });
    }

    if (this.hasActiveSession()) {
      throw new IOSLaunchError({
        code: 'MM_SESSION_ALREADY_RUNNING',
        message: 'A session is already active. Run `mm cleanup` first.',
      });
    }

    // Core CLI currently defaults omitted platform to "browser" before invoking
    // the consumer session manager. For the mobile provider, treat any
    // non-android platform as iOS so `yarn mm launch` works without extra flags.
    if (input.platform === 'android') {
      throw new IOSLaunchError({
        code: 'MM_LAUNCH_FAILED',
        message:
          'Android is not supported in this first-iteration mobile integration.',
      });
    }

    this.launchInProgress = true;

    try {
      const metroPort = this.resolveMetroPort(input.metroPort);

      if (
        this.currentContext === 'prod' &&
        (input.reinstall || input.resetAppData)
      ) {
        process.stderr.write(
          '[mm-mobile] WARNING: Using destructive flags (--reinstall/--reset-app-data) in prod context. Wallet state will be lost.\n',
        );
      }

      const resolved = await validateIOSPrerequisites({
        simulatorDeviceId: input.simulatorDeviceId,
        appBundlePath: input.appBundlePath,
        metroPort,
        context: this.currentContext,
        reinstall: input.reinstall,
        resetAppData: input.resetAppData,
        allowFoxCodeMismatch: input.allowFoxCodeMismatch,
      });

      this.logLaunchMetadata(resolved, { metroPort: input.metroPort });

      // Fail fast: seedContracts requires e2e context with chain + contractSeeding.
      if (
        input.seedContracts &&
        input.seedContracts.length > 0 &&
        this.currentContext !== 'e2e'
      ) {
        throw new IOSLaunchError({
          code: 'MM_LAUNCH_FAILED',
          message: 'seedContracts requires the e2e context.',
        });
      }

      // Store resolved early so the catch block can tear down the runner
      // and app if a later step (capabilities, bind, getAppState) fails.
      this.resolved = resolved;

      appendLog('Starting E2E Capabilities');
      // Start e2e capabilities (anvil + fixture + mock) BEFORE booting the app.
      // The app connects to the fixture server on startup to fetch initial state,
      // so these services must be available before the runner launches.
      await this.startE2ECapabilities(input);

      if (!this.isSimulatorBooted(resolved.simulatorDeviceId)) {
        appendLog('Booting device');
        this.bootSimulator(resolved.simulatorDeviceId);
      }

      this.executeInstallAction(resolved);

      this.injectE2EPortDefaults(resolved);

      if (resolved.metroPort !== undefined) {
        appendLog('Attaching metro port');
        await attachToMetroWatchMode({
          simulatorUdid: resolved.simulatorDeviceId,
          metroPort: resolved.metroPort,
          appBundleId: resolved.appBundleId,
        });
      }

      appendLog('Creating iOS platform driver');
      const iosDriver = await createIOSPlatformDriver(resolved);

      this.iosDriver = iosDriver;
      this.platformDriver = iosDriver.driver;

      // In the metro path, `simctl openurl` (deep link) already launched the
      // app as a side-effect.  In the non-metro (prod) path nothing has started
      // it yet — createBackend() only connects to the simulator, it does not
      // launch the app.  Explicitly open it so getAppState() finds a running
      // process.
      if (resolved.metroPort === undefined) {
        appendLog('Launching app on simulator');
        await iosDriver.backend.openApp(resolved.appBundleId);
      }

      const state = await iosDriver.driver.getAppState();
      const sessionId = randomUUID();
      const startedAt = new Date().toISOString();

      this.sessionId = sessionId;
      this.sessionState = {
        sessionId,
        extensionId: resolved.appBundleId,
        startedAt,
        ports: {
          anvil: input.ports?.anvil ?? 0,
          fixtureServer: input.ports?.fixtureServer ?? 0,
        },
        stateMode: input.stateMode ?? 'default',
      };
      this.sessionMetadata = {
        schemaVersion: 1,
        sessionId,
        createdAt: startedAt,
        goal: input.goal,
        flowTags: input.flowTags ?? [],
        tags: input.tags ?? [],
        launch: {
          stateMode: input.stateMode ?? 'default',
          fixturePreset: input.fixturePreset ?? null,
          extensionPath: resolved.appBundlePath,
          ports: input.ports,
        },
      };

      return {
        sessionId,
        extensionId: resolved.appBundleId,
        state,
      };
    } catch (error) {
      await this.teardownPartialLaunch();
      const launchError = this.toLaunchError(error);
      process.stderr.write(
        `iOS launch failed: ${this.formatLaunchErrorMessage(launchError)}\n`,
      );
      throw launchError;
    } finally {
      this.launchInProgress = false;
    }
  }

  async cleanup(): Promise<boolean> {
    if (!this.hasActiveSession()) {
      return false;
    }

    const resolved = this.resolved;
    const iosDriver = this.iosDriver;

    if (resolved) {
      await this.closeAndTerminateApp(resolved, iosDriver);
    }

    await this.stopE2ECapabilities();

    if (resolved) {
      this.clearE2EPortDefaults(resolved);
    }

    this.sessionId = undefined;
    this.platformDriver = undefined;
    this.iosDriver = undefined;
    this.resolved = undefined;
    this.sessionState = undefined;
    this.sessionMetadata = undefined;
    this.workflowContext = undefined;
    this.refMap.clear();

    return true;
  }

  getPlatformDriver(): IPlatformDriver | undefined {
    return this.platformDriver;
  }

  setPlatformDriver(platformDriver: IPlatformDriver): void {
    this.platformDriver = platformDriver;
  }

  getPage(): Page {
    throw this.notAvailableOnIOS();
  }

  setActivePage(_page: Page): void {
    // Browser-only: iOS sessions are driven by MobilePlatformDriver.
  }

  getTrackedPages(): TrackedPage[] {
    return [];
  }

  classifyPageRole(_page: Page, _extensionId?: string): TabRole {
    return 'extension';
  }

  getContext(): BrowserContext {
    throw this.notAvailableOnIOS();
  }

  async getExtensionState(): Promise<ExtensionState> {
    if (!this.platformDriver) {
      throw this.noActiveIOSSession();
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
    // TODO(Phase 2b follow-up): add native tab-bar navigation support.
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'navigateToHome() not yet implemented for iOS — Phase 2b deferral. Use describe-screen + click instead.',
    });
  }

  async navigateToSettings(): Promise<void> {
    this.assertActiveSession();
    // TODO(Phase 2b follow-up): add native tab-bar navigation support.
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'navigateToSettings() not yet implemented for iOS — Phase 2b deferral. Use describe-screen + click instead.',
    });
  }

  async navigateToUrl(_url: string): Promise<Page> {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: 'URL navigation is browser-only and is not available on iOS.',
    });
  }

  async navigateToNotification(): Promise<Page> {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'Notification pages are browser-only and are not available on iOS.',
    });
  }

  async waitForNotificationPage(_timeoutMs: number): Promise<Page> {
    throw new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message:
        'Notification pages are browser-only and are not available on iOS.',
    });
  }

  async screenshot(
    options: SessionScreenshotOptions,
  ): Promise<ScreenshotResult> {
    if (!this.platformDriver) {
      throw this.noActiveIOSSession();
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
    if (this.currentContext !== 'e2e') return undefined;
    return this.e2eContext?.fixture;
  }

  getChainCapability(): ChainCapability | undefined {
    if (this.currentContext !== 'e2e') return undefined;
    return this.e2eContext?.chain;
  }

  getContractSeedingCapability(): ContractSeedingCapability | undefined {
    if (this.currentContext !== 'e2e') return undefined;
    return this.e2eContext?.contractSeeding;
  }

  getStateSnapshotCapability(): StateSnapshotCapability | undefined {
    return this.workflowContext?.stateSnapshot;
  }

  setWorkflowContext(context: WorkflowContext): void {
    this.workflowContext = context;
    // currentContext is controlled exclusively by setContext(); do not override here.
  }

  getEnvironmentMode(): EnvironmentMode {
    return this.currentContext;
  }

  registerE2ECapabilities(context: WorkflowContext): void {
    this.e2eContext = context;
  }

  setContext(
    context: 'e2e' | 'prod',
    _options?: Record<string, unknown>,
  ): void {
    if (this.hasActiveSession()) {
      throw new IOSLaunchError({
        code: 'MM_LAUNCH_FAILED',
        message:
          'MM_CONTEXT_SWITCH_BLOCKED: Cannot switch context while an iOS session is active. Run `mm cleanup` first.',
      });
    }

    this.currentContext = context;
  }

  getContextInfo(): {
    currentContext: 'e2e' | 'prod';
    hasActiveSession: boolean;
    sessionId: string | null;
    capabilities: { available: string[] };
    canSwitchContext: boolean;
  } {
    return {
      currentContext: this.currentContext,
      hasActiveSession: this.hasActiveSession(),
      sessionId: this.sessionId ?? null,
      capabilities: { available: this.computeAvailableCapabilities() },
      canSwitchContext: !this.hasActiveSession(),
    };
  }

  private installApp(resolved: ResolvedIOSLaunchOptions): void {
    try {
      execFileSync(
        'xcrun',
        [
          'simctl',
          'install',
          resolved.simulatorDeviceId,
          resolved.appBundlePath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      throw new IOSLaunchError({
        code: 'MM_LAUNCH_FAILED',
        message: `Failed to install ${resolved.appBundleId}: ${this.errorMessage(error)}`,
      });
    }
  }

  private executeInstallAction(resolved: ResolvedIOSLaunchOptions): void {
    switch (resolved.installAction) {
      case 'reuse-installed':
        appendLog(`Reusing installed app at ${resolved.appBundlePath}`);
        break;
      case 'reinstall':
        appendLog('Reinstalling: uninstalling existing app');
        this.uninstallApp(resolved);
        this.installApp(resolved);
        break;
      case 'reset-and-install':
        appendLog('Resetting app data: terminating and uninstalling');
        this.terminateSimulatorApp(resolved);
        this.uninstallApp(resolved);
        this.installApp(resolved);
        break;
      case 'install-new':
      case 'install-explicit':
        appendLog('Installing App');
        this.installApp(resolved);
        break;
    }
  }

  private async closeAndTerminateApp(
    resolved: ResolvedIOSLaunchOptions,
    iosDriver: CreatedIOSDriver | undefined,
  ): Promise<void> {
    await iosDriver?.backend
      .closeApp(resolved.appBundleId)
      .catch(() => undefined);
    this.terminateSimulatorApp(resolved);
  }

  private terminateSimulatorApp(resolved: ResolvedIOSLaunchOptions): void {
    try {
      execFileSync(
        'xcrun',
        [
          'simctl',
          'terminate',
          resolved.simulatorDeviceId,
          resolved.appBundleId,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch {
      // best-effort: app might not be running
    }
  }

  private uninstallApp(resolved: ResolvedIOSLaunchOptions): void {
    try {
      execFileSync(
        'xcrun',
        [
          'simctl',
          'uninstall',
          resolved.simulatorDeviceId,
          resolved.appBundleId,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (error) {
      throw new IOSLaunchError({
        code: 'MM_LAUNCH_FAILED',
        message: `Failed to uninstall ${resolved.appBundleId}: ${this.errorMessage(error)}`,
      });
    }
  }

  private resolveMetroPort(inputMetroPort?: number): number | undefined {
    if (inputMetroPort !== undefined) {
      if (
        Number.isInteger(inputMetroPort) &&
        inputMetroPort >= 1 &&
        inputMetroPort <= 65535
      ) {
        return inputMetroPort;
      }
      process.stderr.write(
        `[mm-mobile] Ignoring invalid metroPort=${inputMetroPort} (must be integer 1-65535).\n`,
      );
    }

    const raw = process.env.MM_METRO_PORT?.trim();
    if (!raw) return undefined;

    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      process.stderr.write(
        `[mm-mobile] Ignoring invalid MM_METRO_PORT="${raw}" (must be integer 1-65535).\n`,
      );
      return undefined;
    }

    return port;
  }

  private computeAvailableCapabilities(): string[] {
    const isE2E = this.currentContext === 'e2e';
    const e2e = this.e2eContext;

    return [
      isE2E && e2e?.fixture ? 'fixture' : undefined,
      isE2E && e2e?.chain ? 'chain' : undefined,
      isE2E && e2e?.contractSeeding ? 'contractSeeding' : undefined,
      this.workflowContext?.stateSnapshot ? 'stateSnapshot' : undefined,
      isE2E && e2e?.mockServer ? 'mockServer' : undefined,
    ].filter((capability): capability is string => capability !== undefined);
  }

  private async startE2ECapabilities(input: MobileLaunchInput): Promise<void> {
    if (this.currentContext !== 'e2e' || !this.e2eContext) {
      return;
    }

    const { chain, fixture, mockServer, contractSeeding } = this.e2eContext;

    if (chain) {
      appendLog('Starting chain capability');
      await chain.start();
    }

    if (contractSeeding) {
      appendLog('Starting contract seeding capability');
      contractSeeding.initialize();
    }

    if (fixture) {
      const stateMode = input.stateMode ?? 'default';
      let state: WalletState;
      appendLog('Selecting fixture state');
      if (stateMode === 'onboarding') {
        state = fixture.getOnboardingState();
      } else if (stateMode === 'custom') {
        if (!input.fixturePreset) {
          throw new IOSLaunchError({
            code: 'MM_LAUNCH_FAILED',
            message:
              'stateMode "custom" requires a fixturePreset. ' +
              'Use --preset <name> or set fixturePreset in the launch input.',
          });
        }
        state = fixture.resolvePreset(input.fixturePreset);
      } else {
        state = fixture.getDefaultState();
      }

      state = rewritePortsInWalletState(state, {
        anvilPort: (
          chain as MetaMaskMobileChainCapability | undefined
        )?.getPort(),
        mockServerPort: (
          mockServer as MetaMaskMobileMockServerCapability | undefined
        )?.getPort(),
      });

      appendLog('Starting fixture capability');
      await fixture.start(state);
    }

    if (mockServer) {
      appendLog('Starting mockServer capability');
      await mockServer.start();
    }

    if (input.seedContracts && input.seedContracts.length > 0) {
      if (!chain || !contractSeeding) {
        throw new IOSLaunchError({
          code: 'MM_LAUNCH_FAILED',
          message:
            'seedContracts requires the chain and contractSeeding capabilities (e2e context).',
        });
      }

      const result = await contractSeeding.deployContracts(input.seedContracts);
      if (result.failed.length > 0) {
        const summary = result.failed
          .map((f) => `${f.name}: ${f.error}`)
          .join('; ');
        throw new IOSLaunchError({
          code: 'MM_LAUNCH_FAILED',
          message: `Contract seeding failed: ${summary}`,
        });
      }
    }
  }

  private async stopE2ECapabilities(): Promise<void> {
    if (!this.e2eContext) {
      return;
    }
    const { chain, fixture, mockServer, contractSeeding } = this.e2eContext;
    // Reverse order
    if (contractSeeding) {
      contractSeeding.clearRegistry();
    }
    if (mockServer) {
      await mockServer.stop().catch(() => undefined);
    }
    if (fixture) {
      await fixture.stop().catch(() => undefined);
    }
    if (chain) {
      await chain.stop().catch(() => undefined);
    }
  }

  private async teardownPartialLaunch(): Promise<void> {
    const { iosDriver, resolved } = this;
    if (resolved) {
      await this.closeAndTerminateApp(resolved, iosDriver);
    }

    await this.stopE2ECapabilities().catch(() => undefined);

    if (resolved) {
      this.clearE2EPortDefaults(resolved);
    }

    this.platformDriver = undefined;
    this.iosDriver = undefined;
    this.resolved = undefined;
    this.refMap.clear();
  }

  private assertActiveSession(): void {
    if (!this.hasActiveSession()) {
      throw this.noActiveIOSSession();
    }
  }

  private noActiveIOSSession(): IOSLaunchError {
    return new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: 'No active iOS session. Run `mm launch` first.',
    });
  }

  private notAvailableOnIOS(): IOSLaunchError {
    return new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: IOS_PAGE_UNAVAILABLE,
    });
  }

  private toLaunchError(error: unknown): IOSLaunchError {
    if (error instanceof IOSLaunchError) {
      return error;
    }

    return new IOSLaunchError({
      code: 'MM_LAUNCH_FAILED',
      message: this.errorMessage(error),
    });
  }

  private formatLaunchErrorMessage(error: IOSLaunchError): string {
    const message = `${error.code}: ${error.message}`;
    return error.remediation
      ? `${message}\nRemediation: ${error.remediation}`
      : message;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private logLaunchMetadata(
    resolved: ResolvedIOSLaunchOptions,
    launchInput: { metroPort?: number },
  ): void {
    const metroSource = launchInput.metroPort
      ? '--metro-port'
      : process.env.MM_METRO_PORT
        ? 'MM_METRO_PORT'
        : 'none';
    const lines = [
      `[mm-mobile] context=${this.currentContext}`,
      `[mm-mobile] simulator=${resolved.simulatorDeviceId}`,
      `[mm-mobile] selectedApp=${resolved.appBundlePath}`,
      `[mm-mobile] bundleId=${resolved.appBundleId}`,
      `[mm-mobile] version=${resolved.selectedAppMetadata.shortVersion ?? 'unknown'}`,
      `[mm-mobile] build=${resolved.selectedAppMetadata.buildVersion ?? 'unknown'}`,
      `[mm-mobile] fox_code=${resolved.selectedAppMetadata.foxCode ?? 'unknown'}`,
      `[mm-mobile] appAlreadyInstalled=${resolved.appAlreadyInstalled}`,
      `[mm-mobile] installAction=${resolved.installAction}`,
      `[mm-mobile] metroPort=${resolved.metroPort ?? 'none'} source=${metroSource}`,
    ];

    if (resolved.installedAppMetadata) {
      lines.push(
        `[mm-mobile] installedApp=${resolved.installedAppMetadata.appBundlePath}`,
        `[mm-mobile] installedFoxCode=${resolved.installedAppMetadata.foxCode ?? 'unknown'}`,
      );
    }

    process.stderr.write(lines.join('\n') + '\n');
  }

  private isSimulatorBooted(udid: string): boolean {
    try {
      const raw = execFileSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
        encoding: 'utf-8',
      });
      const parsed = JSON.parse(raw) as {
        devices?: Record<string, { udid: string; state?: string }[]>;
      };
      for (const devices of Object.values(parsed.devices ?? {})) {
        for (const entry of devices) {
          if (entry.udid === udid && entry.state === 'Booted') {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private bootSimulator(udid: string): void {
    execFileSync('xcrun', ['simctl', 'boot', udid], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  private injectE2EPortDefaults(resolved: ResolvedIOSLaunchOptions): void {
    if (this.currentContext !== 'e2e' || !this.e2eContext) {
      return;
    }

    const fixture = this.e2eContext.fixture;
    if (!fixture) {
      return;
    }

    const fixturePort =
      (fixture as { port?: number }).port ??
      (this.e2eContext.config as { ports?: { fixtureServer?: number } })?.ports
        ?.fixtureServer;

    if (fixturePort === undefined) {
      return;
    }

    try {
      execFileSync(
        'xcrun',
        [
          'simctl',
          'spawn',
          resolved.simulatorDeviceId,
          'defaults',
          'write',
          resolved.appBundleId,
          'fixtureServerPort',
          '-string',
          String(fixturePort),
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch {
      appendLog(
        `Failed to inject fixtureServerPort=${fixturePort} into NSUserDefaults`,
      );
    }
  }

  private clearE2EPortDefaults(resolved: ResolvedIOSLaunchOptions): void {
    try {
      execFileSync(
        'xcrun',
        [
          'simctl',
          'spawn',
          resolved.simulatorDeviceId,
          'defaults',
          'delete',
          resolved.appBundleId,
          'fixtureServerPort',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch {
      // Key might not exist — best-effort
    }
  }
}
