/* eslint-disable import/no-nodejs-modules */
import { existsSync } from 'fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';
/* eslint-enable import/no-nodejs-modules */

import {
  IOSPlatformDriver,
  XCUITestClient,
  bootDevice,
  isBooted,
  launchApp,
  terminateApp,
  startRunner,
  stopRunner,
  waitForReady,
  setPlatformDriver,
  clearPlatformDriver,
} from '@metamask/client-mcp-core';

import type { MobileLaunchOptions } from './launcher-types';

const execFile = promisify(execFileCb);

const DEFAULT_BUNDLE_ID = 'io.metamask.MetaMask';
const DEFAULT_RUNNER_PORT_TIMEOUT_MS = 60_000;
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 15_000;
const DEFAULT_POST_METRO_STABILIZATION_DELAY_MS = 1_500;
const DEFAULT_POST_METRO_RETRY_DELAY_MS = 1_000;
const DEFAULT_POST_METRO_BIND_RETRY_ATTEMPTS = 5;
const DEFAULT_LOCAL_XCUITEST_RUNNER_DERIVED_DATA_PATH = path.join(
  process.cwd(),
  'ios-runner-derived-data',
);
const NODE_MODULES_XCUITEST_RUNNER_DERIVED_DATA_PATH = path.join(
  process.cwd(),
  'node_modules',
  '@metamask',
  'client-mcp-core',
  'ios-runner-derived-data',
);
const DEFAULT_RUNNER_BUILD_TIMEOUT_MS = 10 * 60_000;
const DEFAULT_SCREENSHOT_DIR = path.join(
  process.cwd(),
  'test-artifacts',
  'ios-screenshots',
);
const DEFAULT_RUNNER_LOG_DIR = path.join(
  process.cwd(),
  'test-artifacts',
  'ios-runner-logs',
);

interface ResolvedLaunchConfig {
  simulatorDeviceId: string;
  appBundlePath: string;
  appBundleId: string;
  anvilPort: number;
  fixtureServerPort: number;
  metroPort: number | null;
  runnerDerivedDataPath: string;
  screenshotDir: string;
  runnerLogDir: string;
}

export interface AppLaunchResult {
  simulatorDeviceId: string;
  runnerPort: number;
  appBundleId: string;
}

export class MetaMaskMobileAppLauncher {
  private config: ResolvedLaunchConfig | undefined;

  private runnerPort: number | undefined;

  private iosDriver: IOSPlatformDriver | undefined;

  private xcuiTestClient: XCUITestClient | undefined;

  private destination: string | undefined;

  private isLaunched = false;

  async launch(options: MobileLaunchOptions): Promise<AppLaunchResult> {
    if (this.isLaunched) {
      throw new Error(
        'App is already launched. Call stop() before launching again.',
      );
    }

    this.config = this.resolveConfig(options);
    this.validateConfig(this.config);

    const isWatchMode = this.config.metroPort !== null;

    try {
      await this.bootSimulator(this.config.simulatorDeviceId);

      if (!isWatchMode) {
        await this.installApp(
          this.config.simulatorDeviceId,
          this.config.appBundlePath,
        );

        await this.launchAppOnSimulator(
          this.config.simulatorDeviceId,
          this.config.appBundleId,
        );
      }

      this.config.runnerDerivedDataPath =
        await this.resolveRunnerDerivedDataPath(options);

      this.destination = `platform=iOS Simulator,id=${this.config.simulatorDeviceId}`;
      this.runnerPort = await this.startXCUITestRunner(
        this.config.runnerDerivedDataPath,
        this.destination,
      );

      this.xcuiTestClient = new XCUITestClient({
        port: this.runnerPort,
      });

      this.iosDriver = new IOSPlatformDriver(
        this.xcuiTestClient,
        this.config.simulatorDeviceId,
        {
          screenshotDir: this.config.screenshotDir,
          recoverRunner: async () => this.recoverRunnerSession(),
          appBundleId: this.config.appBundleId,
        },
      );

      setPlatformDriver(this.iosDriver);

      const isReady = await this.performHealthCheck(this.xcuiTestClient);
      if (!isReady) {
        throw new Error(
          'XCUITest runner health check failed: runner did not become ready within timeout',
        );
      }

      if (isWatchMode) {
        // Watch mode: connectToMetro launches the app via deep link (openurl),
        // then stabilize re-binds the runner to the Metro-connected app.
        const metroPort = this.config.metroPort;
        if (!metroPort) {
          throw new Error('Metro port is required when watch mode is enabled');
        }

        await this.connectToMetro(this.config.simulatorDeviceId, metroPort);
        await this.stabilizeAfterMetroAttach(this.config.appBundleId);
      } else {
        await this.bindRunnerToApp(this.config.appBundleId);
      }

      this.isLaunched = true;

      return {
        simulatorDeviceId: this.config.simulatorDeviceId,
        runnerPort: this.runnerPort,
        appBundleId: this.config.appBundleId,
      };
    } catch (error) {
      console.error('Launch failed, cleaning up...');
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // TODO: pass this.destination once core rebuilds with stopRunner(destination?) signature
      await stopRunner();
    } catch (e) {
      console.warn('Failed to stop XCUITest runner:', e);
    }

    clearPlatformDriver();

    if (this.config) {
      try {
        await terminateApp(
          this.config.simulatorDeviceId,
          this.config.appBundleId,
        );
      } catch (e) {
        console.warn('Failed to terminate app on simulator:', e);
      }
    }

    this.iosDriver = undefined;
    this.xcuiTestClient = undefined;
    this.runnerPort = undefined;
    this.destination = undefined;
    this.config = undefined;
    this.isLaunched = false;
  }

  getIsLaunched(): boolean {
    return this.isLaunched;
  }

  getDriver(): IOSPlatformDriver | undefined {
    return this.iosDriver;
  }

  getRunnerPort(): number | undefined {
    return this.runnerPort;
  }

  private resolveConfig(options: MobileLaunchOptions): ResolvedLaunchConfig {
    return {
      simulatorDeviceId: options.simulatorDeviceId ?? '',
      appBundlePath: options.appBundlePath ?? '',
      appBundleId: DEFAULT_BUNDLE_ID,
      anvilPort: options.anvilPort ?? 8545,
      fixtureServerPort: options.fixtureServerPort ?? 12345,
      metroPort: options.metroPort ?? null,
      runnerDerivedDataPath: options.runnerDerivedDataPath ?? '',
      screenshotDir: DEFAULT_SCREENSHOT_DIR,
      runnerLogDir: DEFAULT_RUNNER_LOG_DIR,
    };
  }

  private async resolveRunnerDerivedDataPath(
    options: MobileLaunchOptions,
  ): Promise<string> {
    const explicitPath = options.runnerDerivedDataPath;
    if (explicitPath) {
      if (!existsSync(explicitPath)) {
        throw new Error(
          `Configured runnerDerivedDataPath does not exist: ${explicitPath}`,
        );
      }
      return explicitPath;
    }

    const envPath = process.env.MM_IOS_RUNNER_DERIVED_DATA_PATH;
    if (envPath && existsSync(envPath)) {
      return envPath;
    }

    if (existsSync(NODE_MODULES_XCUITEST_RUNNER_DERIVED_DATA_PATH)) {
      return NODE_MODULES_XCUITEST_RUNNER_DERIVED_DATA_PATH;
    }

    if (existsSync(DEFAULT_LOCAL_XCUITEST_RUNNER_DERIVED_DATA_PATH)) {
      return DEFAULT_LOCAL_XCUITEST_RUNNER_DERIVED_DATA_PATH;
    }

    const builtRunnerPath = await this.buildRunnerFromClientMcpCore();
    if (builtRunnerPath) {
      return builtRunnerPath;
    }

    throw new Error(
      'Could not locate iOS runner derived data.\n\n' +
        'Resolution order:\n' +
        '  1. launch input: runnerDerivedDataPath\n' +
        '  2. env: MM_IOS_RUNNER_DERIVED_DATA_PATH\n' +
        '  3. node_modules/@metamask/client-mcp-core/ios-runner-derived-data\n' +
        '  4. ./ios-runner-derived-data\n' +
        '  5. auto-build via ../client-mcp-core/scripts/build-ios-runner.sh\n\n' +
        'Set MM_IOS_RUNNER_DERIVED_DATA_PATH or provide runnerDerivedDataPath to override.',
    );
  }

  private async buildRunnerFromClientMcpCore(): Promise<string | null> {
    const buildScriptPath = this.resolveClientMcpCoreBuildScriptPath();
    if (!buildScriptPath) {
      return null;
    }

    const clientMcpCoreRoot = path.dirname(path.dirname(buildScriptPath));
    console.error(
      `Building iOS runner in client-mcp-core (${clientMcpCoreRoot})...`,
    );

    await execFile('bash', [buildScriptPath], {
      cwd: clientMcpCoreRoot,
      timeout: DEFAULT_RUNNER_BUILD_TIMEOUT_MS,
    });

    const candidatePaths = [
      path.join(clientMcpCoreRoot, 'ios-runner-derived-data'),
      path.join(clientMcpCoreRoot, 'build', 'ios-runner-derived-data'),
      path.join(clientMcpCoreRoot, 'dist', 'ios-runner-derived-data'),
    ];

    const resolvedPath = candidatePaths.find((candidate) =>
      existsSync(candidate),
    );
    if (!resolvedPath) {
      throw new Error(
        `client-mcp-core build completed but no runner output was found under ${clientMcpCoreRoot}`,
      );
    }

    console.error(`Using iOS runner derived data at ${resolvedPath}`);
    return resolvedPath;
  }

  private resolveClientMcpCoreBuildScriptPath(): string | null {
    const explicitCoreRoot = process.env.METAMASK_CLIENT_MCP_CORE_PATH;
    const coreRoots = [
      explicitCoreRoot,
      path.resolve(process.cwd(), '..', 'client-mcp-core'),
      path.resolve(process.cwd(), '..', '..', 'client-mcp-core'),
    ].filter((root): root is string => Boolean(root));

    for (const coreRoot of coreRoots) {
      const scriptPath = path.join(coreRoot, 'scripts', 'build-ios-runner.sh');
      if (existsSync(scriptPath)) {
        return scriptPath;
      }
    }

    return null;
  }

  private validateConfig(config: ResolvedLaunchConfig): void {
    if (!config.simulatorDeviceId) {
      throw new Error(
        'Configuration error: simulatorDeviceId is required.\n' +
          'Provide the iOS Simulator UDID, e.g., "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX".\n' +
          'List available simulators with: xcrun simctl list devices',
      );
    }

    if (!config.appBundlePath) {
      throw new Error(
        'Configuration error: appBundlePath is required.\n' +
          'Provide the path to the built .app bundle, e.g.,\n' +
          '  "ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app"',
      );
    }

    if (!existsSync(config.appBundlePath)) {
      throw new Error(
        `App bundle not found at: ${config.appBundlePath}\n\n` +
          'The app must be built before launching.\n' +
          'Use the mm_build tool or run the build manually.',
      );
    }
  }

  private async bootSimulator(udid: string): Promise<void> {
    const alreadyBooted = await isBooted(udid);
    if (alreadyBooted) {
      console.error(`Simulator ${udid} is already booted`);
      return;
    }

    console.error(`Booting simulator ${udid}...`);
    try {
      await bootDevice(udid);
    } catch (error) {
      // Boot may fail if device is already booted (race condition)
      const alreadyBootedNow = await isBooted(udid);
      if (!alreadyBootedNow) {
        throw error;
      }
    }
    console.error(`Simulator ${udid} booted`);
  }

  private async installApp(udid: string, appPath: string): Promise<void> {
    console.error(`Installing app from ${appPath}...`);
    await execFile('xcrun', ['simctl', 'install', udid, appPath], {
      timeout: 30_000,
    });
    console.error('App installed on simulator');
  }

  private async launchAppOnSimulator(
    udid: string,
    bundleId: string,
  ): Promise<void> {
    console.error(`Launching ${bundleId} on simulator ${udid}...`);
    await launchApp(udid, bundleId);
    console.error('App launched on simulator');
  }

  private async connectToMetro(udid: string, port: number): Promise<void> {
    const bundleUrl =
      `http://localhost:${port}/index.bundle?` +
      'platform=ios&dev=true&minify=false&disableOnboarding=1';
    const metroUrl =
      `expo-metamask://expo-development-client/?url=` +
      encodeURIComponent(bundleUrl);
    console.error(`Connecting app to Metro bundler at ${bundleUrl}...`);
    try {
      await execFile('xcrun', ['simctl', 'openurl', udid, metroUrl], {
        timeout: 10_000,
      });
      console.error('App connected to Metro bundler');
    } catch (error) {
      throw new Error(
        `Failed to connect app to Metro bundler at ${metroUrl}: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async stabilizeAfterMetroAttach(appBundleId: string): Promise<void> {
    console.error('Waiting for app stabilization after Metro attach...');
    await this.sleep(DEFAULT_POST_METRO_STABILIZATION_DELAY_MS);

    let lastError: unknown;
    for (
      let attempt = 1;
      attempt <= DEFAULT_POST_METRO_BIND_RETRY_ATTEMPTS;
      attempt += 1
    ) {
      try {
        await this.bindRunnerToApp(appBundleId);
        console.error('App stabilized after Metro attach');
        return;
      } catch (error) {
        lastError = error;
        if (attempt < DEFAULT_POST_METRO_BIND_RETRY_ATTEMPTS) {
          console.warn(
            `Post-Metro stabilization attempt ${attempt} failed; retrying...`,
            error,
          );
          await this.sleep(DEFAULT_POST_METRO_RETRY_DELAY_MS);
        }
      }
    }

    throw new Error(
      'Post-Metro stabilization failed after retries: ' +
        `${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  private async sleep(durationMs: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private async bindRunnerToApp(appBundleId: string): Promise<void> {
    if (!this.runnerPort) {
      throw new Error('Runner port is not available for app binding.');
    }

    if (this.xcuiTestClient) {
      console.error(`Binding XCUITest runner to app bundle ${appBundleId}...`);
      await this.xcuiTestClient.bind(appBundleId);
      console.error(`XCUITest runner bound to app bundle ${appBundleId}`);
      return;
    }

    const runnerUrl = `http://127.0.0.1:${this.runnerPort}/command`;
    console.error(`Binding XCUITest runner to app bundle ${appBundleId}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(runnerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: 'bind',
        appBundleId,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      throw new Error(
        `Failed to bind runner to app bundle ${appBundleId}: HTTP ${response.status}`,
      );
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      error?: { message?: string };
    };

    if (!payload.ok) {
      throw new Error(
        `Failed to bind runner to app bundle ${appBundleId}: ` +
          `${payload.error?.message ?? 'unknown runner error'}`,
      );
    }

    console.error(`XCUITest runner bound to app bundle ${appBundleId}`);
  }

  private async startXCUITestRunner(
    derivedDataPath: string,
    destination: string,
  ): Promise<number> {
    console.error('Starting XCUITest runner...');

    if (!existsSync(derivedDataPath)) {
      throw new Error(
        `Runner derived data directory does not exist: ${derivedDataPath}`,
      );
    }

    const runnerOptions = {
      derivedDataPath,
      destination,
      timeoutMs: DEFAULT_RUNNER_PORT_TIMEOUT_MS,
      logDir: this.config?.runnerLogDir ?? DEFAULT_RUNNER_LOG_DIR,
    };

    const port = await startRunner(runnerOptions);
    console.error(`XCUITest runner started on port ${port}`);
    return port;
  }

  private async recoverRunnerSession(): Promise<XCUITestClient> {
    if (!this.config || !this.destination) {
      throw new Error('Cannot recover runner: launcher is not initialized');
    }

    console.warn(
      'Runner connection lost; restarting XCUITest runner session...',
    );

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await stopRunner(this.destination);
        await this.sleep(500);

        const restartedPort = await this.startXCUITestRunner(
          this.config.runnerDerivedDataPath,
          this.destination,
        );

        const recoveredClient = new XCUITestClient({
          port: restartedPort,
        });

        const isReady = await this.performHealthCheck(recoveredClient);
        if (!isReady) {
          throw new Error('Recovered runner failed health check');
        }

        this.runnerPort = restartedPort;
        this.xcuiTestClient = recoveredClient;

        await this.bindRunnerToApp(this.config.appBundleId);

        console.warn(
          `XCUITest runner recovered and rebound on port ${restartedPort}`,
        );
        return recoveredClient;
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          console.warn(
            `Runner recovery attempt ${attempt} failed; retrying...`,
            error,
          );
          await this.sleep(1_000);
        }
      }
    }

    throw new Error(
      `Failed to recover runner after retries: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  private async performHealthCheck(client: XCUITestClient): Promise<boolean> {
    console.error('Performing health check on XCUITest runner...');

    const clientWithReadiness = client as XCUITestClient & {
      waitForRunner?: (timeoutMs?: number) => Promise<boolean>;
      healthCheck?: () => Promise<boolean>;
    };

    let isReady = false;
    if (typeof clientWithReadiness.waitForRunner === 'function') {
      const waitForRunnerResult = await clientWithReadiness.waitForRunner(
        DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
      );
      if (typeof waitForRunnerResult === 'boolean') {
        isReady = waitForRunnerResult;
      }
    }

    if (!isReady) {
      isReady = await waitForReady(
        () => clientWithReadiness.healthCheck?.() ?? Promise.resolve(false),
        DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
      );
    }

    if (isReady) {
      console.error('XCUITest runner is ready');
    } else {
      console.error('XCUITest runner health check failed');
    }

    return isReady;
  }
}

export async function launchMetaMaskMobile(
  options: MobileLaunchOptions,
): Promise<MetaMaskMobileAppLauncher> {
  const launcher = new MetaMaskMobileAppLauncher();
  await launcher.launch(options);
  return launcher;
}
