/* eslint-disable import-x/no-nodejs-modules, import-x/no-extraneous-dependencies */
import { execFileSync } from 'node:child_process';

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
  generateSessionId,
  knowledgeStore,
} from '@metamask/client-mcp-core';

import {
  createIOSPlatformDriver,
  type CreatedIOSDriver,
} from './ios/platform-driver-factory';
import { attachToMetroWatchMode } from './ios/metro-watch-attach';
import { ensureAccessibilityBridgeEnabled } from './ios/accessibility-bridge';
import { probeHermesHealthy } from './ios/hermes-health';
import { validateIOSPrerequisites } from './ios/prerequisites';
import {
  IOSLaunchError,
  type ResolvedIOSLaunchOptions,
} from './launcher-types';
import { appendLog } from './utils';

const IOS_PAGE_UNAVAILABLE =
  'Playwright Page/BrowserContext is not available on iOS sessions.';

const PURE_ATTACH_PROBE_INTERVAL_MS = 500;
const PURE_ATTACH_PROBE_CEILING_MS = 3_000;

function isNewBinaryAction(
  action: ResolvedIOSLaunchOptions['installAction'],
): boolean {
  return (
    action === 'install-explicit' ||
    action === 'install-new' ||
    action === 'reinstall' ||
    action === 'reset-and-install'
  );
}

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
    if (this.launchInProgress) {
      throw new IOSLaunchError({
        code: 'MM_SESSION_ALREADY_RUNNING',
        message:
          'A launch is already in progress. Wait for it to complete or run `mm cleanup` first.',
      });
    }

    const force =
      (input as SessionLaunchInput & { force?: boolean }).force === true;
    if (this.hasActiveSession()) {
      if (force) {
        appendLog(
          'Force flag set — cleaning up existing session before launch',
        );
        await this.cleanup();
      } else {
        throw new IOSLaunchError({
          code: 'MM_SESSION_ALREADY_RUNNING',
          message:
            'A session is already active. Run `mm cleanup` first or use --force.',
        });
      }
    }

    // The core launch schema defaults `platform` to "browser" before invoking
    // the consumer session manager. For the mobile provider, treat any
    // non-android platform as iOS so `yarn mm launch` works without extra flags.
    if (input.platform === 'android') {
      throw new IOSLaunchError({
        code: 'MM_INVALID_CONFIG',
        message:
          'Android is not supported in this first-iteration mobile integration.',
      });
    }

    // MetaMask Mobile is prod-only and operates on the already-installed
    // wallet.  The generic core CLI/schema accepts E2E-oriented launch
    // options (state/fixture/seeding/ports) that have no effect here.
    // Reject them explicitly so an agent does not mistakenly believe it
    // has a fresh or seeded test wallet.
    const unsupported: string[] = [];
    if (input.stateMode !== undefined && input.stateMode !== 'default') {
      unsupported.push(`stateMode='${input.stateMode}'`);
    }
    if (input.fixturePreset !== undefined) {
      unsupported.push('fixturePreset');
    }
    if (input.fixture !== undefined) {
      unsupported.push('fixture');
    }
    if (input.seedContracts !== undefined && input.seedContracts.length > 0) {
      unsupported.push('seedContracts');
    }
    if (input.ports !== undefined) {
      unsupported.push('ports');
    }
    if (unsupported.length > 0) {
      throw new IOSLaunchError({
        code: 'MM_INVALID_CONFIG',
        message:
          'MetaMask Mobile is prod-only and operates on the already-installed wallet. ' +
          `Unsupported E2E launch option(s): ${unsupported.join(', ')}. ` +
          'State initialization, fixtures, contract seeding, and port configuration are not available in this workflow.',
      });
    }

    this.launchInProgress = true;

    try {
      const metroPort = this.resolveMetroPort(input.metroPort);

      if (input.reinstall || input.resetAppData) {
        process.stderr.write(
          '[mm-mobile] WARNING: Using destructive flags (--reinstall/--reset-app-data) in prod context. Wallet state will be lost.\n',
        );
      }

      const resolved = await validateIOSPrerequisites({
        simulatorDeviceId: input.deviceId,
        appBundlePath: input.appBundlePath,
        metroPort,
        reinstall: input.reinstall,
        resetAppData: input.resetAppData,
        allowFoxCodeMismatch: input.allowFoxCodeMismatch,
      });

      this.logLaunchMetadata(resolved, { metroPort: input.metroPort });

      // Store resolved early so the catch block can tear down the runner
      // and app if a later step (capabilities, bind, getAppState) fails.
      this.resolved = resolved;

      if (!this.isSimulatorBooted(resolved.simulatorDeviceId)) {
        appendLog('Booting device');
        this.bootSimulator(resolved.simulatorDeviceId);
      }

      const { wasAlreadyOn: bridgeWasAlreadyOn } =
        ensureAccessibilityBridgeEnabled(resolved.simulatorDeviceId);
      appendLog(`Accessibility bridge: wasAlreadyOn=${bridgeWasAlreadyOn}`);

      this.executeInstallAction(resolved);

      appendLog('Creating iOS platform driver');
      const iosDriver = await createIOSPlatformDriver(resolved);

      this.iosDriver = iosDriver;
      this.platformDriver = iosDriver.driver;

      const newBinaryInstalled = isNewBinaryAction(resolved.installAction);
      let appIsRunning: boolean;

      if (newBinaryInstalled) {
        if (resolved.installAction === 'install-explicit') {
          this.terminateSimulatorApp(resolved);
        }
        appIsRunning = false;
      } else {
        const rawState = await iosDriver.backend.getAppState(
          resolved.appBundleId,
        );
        if (rawState.state === 'Not Installed') {
          throw new IOSLaunchError({
            code: 'MM_INVALID_CONFIG',
            message: 'MetaMask app is not installed on the target simulator.',
            remediation: 'Install the app first or pass --app-bundle <path>.',
          });
        }
        appIsRunning = rawState.state === 'Running';
      }

      if (resolved.metroPort !== undefined) {
        if (appIsRunning && bridgeWasAlreadyOn) {
          appendLog(
            'Metro branch: app running with bridge already on — pure attach candidate',
          );
          const healthResult = await probeHermesHealthy({
            port: resolved.metroPort,
            appId: resolved.appBundleId,
            intervalMs: PURE_ATTACH_PROBE_INTERVAL_MS,
            ceilingMs: PURE_ATTACH_PROBE_CEILING_MS,
          });

          if (healthResult.healthy) {
            appendLog(
              'Pure attach: app healthily attached to Metro, skipping relaunch',
            );
          } else {
            appendLog(
              `Pure attach failed (${healthResult.reason}) — terminating and deep-linking`,
            );
            this.terminateSimulatorApp(resolved);
            await attachToMetroWatchMode({
              simulatorUdid: resolved.simulatorDeviceId,
              metroPort: resolved.metroPort,
              appBundleId: resolved.appBundleId,
            });
          }
        } else if (appIsRunning && !bridgeWasAlreadyOn) {
          appendLog(
            'Metro branch: app running but bridge just flipped — relaunching for a11y',
          );
          this.terminateSimulatorApp(resolved);
          await attachToMetroWatchMode({
            simulatorUdid: resolved.simulatorDeviceId,
            metroPort: resolved.metroPort,
            appBundleId: resolved.appBundleId,
          });
        } else {
          appendLog('Metro branch: app not running — deep-linking to launch');
          await attachToMetroWatchMode({
            simulatorUdid: resolved.simulatorDeviceId,
            metroPort: resolved.metroPort,
            appBundleId: resolved.appBundleId,
          });
        }
      } else if (appIsRunning && !bridgeWasAlreadyOn) {
        appendLog(
          'Prod branch: app running but bridge just flipped — relaunching for a11y',
        );
        this.terminateSimulatorApp(resolved);
        await iosDriver.backend.openApp(resolved.appBundleId);
      } else if (!appIsRunning) {
        appendLog('Prod branch: app not running — launching');
        await iosDriver.backend.openApp(resolved.appBundleId);
      } else {
        appendLog(
          'Prod branch: app running with bridge already on — pure attach',
        );
      }

      const state = await iosDriver.driver.getAppState();
      const sessionId = generateSessionId();
      const startedAt = new Date().toISOString();

      this.sessionId = sessionId;
      this.sessionState = {
        sessionId,
        extensionId: resolved.appBundleId,
        startedAt,
        ports: {
          anvil: 0,
          fixtureServer: 0,
        },
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
          extensionPath: resolved.appBundlePath,
          ports: undefined,
        },
      };

      await knowledgeStore.writeSessionMetadata(this.sessionMetadata);

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
    if (this.launchInProgress) {
      throw new IOSLaunchError({
        code: 'MM_SESSION_ALREADY_RUNNING',
        message:
          'A launch is in progress. Wait for it to complete before running `mm cleanup`.',
      });
    }

    if (!this.hasActiveSession()) {
      return false;
    }

    const resolved = this.resolved;
    const iosDriver = this.iosDriver;

    try {
      if (resolved) {
        await this.closeAndTerminateApp(resolved, iosDriver);
      }
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
      throw new IOSLaunchError({
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
    return this.workflowContext?.stateSnapshot ? ['stateSnapshot'] : [];
  }

  private async teardownPartialLaunch(): Promise<void> {
    const { iosDriver, resolved } = this;
    if (resolved) {
      await this.closeAndTerminateApp(resolved, iosDriver);
    }

    this.resetSessionState();
  }

  private resetSessionState(): void {
    this.sessionId = undefined;
    this.platformDriver = undefined;
    this.iosDriver = undefined;
    this.resolved = undefined;
    this.sessionState = undefined;
    this.sessionMetadata = undefined;
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
    if (error && typeof error === 'object' && 'stderr' in error) {
      const { stderr } = error as { stderr?: Buffer | string };
      const text =
        typeof stderr === 'string'
          ? stderr
          : stderr instanceof Buffer
            ? stderr.toString('utf8')
            : '';
      const trimmed = text.trim();
      if (trimmed) {
        return trimmed;
      }
    }
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
      '[mm-mobile] context=prod',
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
    try {
      execFileSync('xcrun', ['simctl', 'boot', udid], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      throw new IOSLaunchError({
        code: 'MM_DEVICE_NOT_AVAILABLE',
        message: `Failed to boot simulator ${udid}: ${this.errorMessage(error)}`,
        remediation:
          'Run `xcrun simctl list devices` to verify the UDID and simulator state.',
      });
    }
  }
}
