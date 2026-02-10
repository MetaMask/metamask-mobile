/* eslint-disable import/no-nodejs-modules */
import { existsSync, promises as fs } from 'fs';
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
  type RunnerOptions,
} from '@metamask/client-mcp-core';

import type { MobileLaunchOptions } from './launcher-types';

const execFile = promisify(execFileCb);

const DEFAULT_BUNDLE_ID = 'io.metamask';
const DEFAULT_RUNNER_PORT_TIMEOUT_MS = 60_000;
const DEFAULT_HEALTH_CHECK_TIMEOUT_MS = 15_000;
const DEFAULT_XCUITEST_RUNNER_DERIVED_DATA_PATH = path.join(
  process.cwd(),
  'ios-runner-derived-data',
);
const DEFAULT_SCREENSHOT_DIR = '/tmp/ios-screenshots';

interface ResolvedLaunchConfig {
  simulatorDeviceId: string;
  appBundlePath: string;
  appBundleId: string;
  anvilPort: number;
  fixtureServerPort: number;
  runnerDerivedDataPath: string;
  screenshotDir: string;
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

    try {
      await this.bootSimulator(this.config.simulatorDeviceId);

      await this.installApp(
        this.config.simulatorDeviceId,
        this.config.appBundlePath,
      );

      await this.launchAppOnSimulator(
        this.config.simulatorDeviceId,
        this.config.appBundleId,
      );

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
        },
      );

      // CRITICAL — Register the iOS driver for all MCP tool calls
      setPlatformDriver(this.iosDriver);

      const isReady = await this.performHealthCheck(this.xcuiTestClient);
      if (!isReady) {
        throw new Error(
          'XCUITest runner health check failed: runner did not become ready within timeout',
        );
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
      stopRunner();
    } catch (e) {
      console.warn('Failed to stop XCUITest runner:', e);
    }

    // CRITICAL — Clear the platform driver so run-tool.ts stops routing to iOS
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
      runnerDerivedDataPath: DEFAULT_XCUITEST_RUNNER_DERIVED_DATA_PATH,
      screenshotDir: DEFAULT_SCREENSHOT_DIR,
    };
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
      console.log(`Simulator ${udid} is already booted`);
      return;
    }

    console.log(`Booting simulator ${udid}...`);
    try {
      await bootDevice(udid);
    } catch (error) {
      // Boot may fail if device is already booted (race condition)
      const alreadyBootedNow = await isBooted(udid);
      if (!alreadyBootedNow) {
        throw error;
      }
    }
    console.log(`Simulator ${udid} booted`);
  }

  private async installApp(udid: string, appPath: string): Promise<void> {
    console.log(`Installing app from ${appPath}...`);
    await execFile('xcrun', ['simctl', 'install', udid, appPath], {
      timeout: 30_000,
    });
    console.log('App installed on simulator');
  }

  private async launchAppOnSimulator(
    udid: string,
    bundleId: string,
  ): Promise<void> {
    console.log(`Launching ${bundleId} on simulator ${udid}...`);
    await launchApp(udid, bundleId);
    console.log('App launched on simulator');
  }

  private async startXCUITestRunner(
    derivedDataPath: string,
    destination: string,
  ): Promise<number> {
    console.log('Starting XCUITest runner...');

    // Verify derived data path exists
    if (!existsSync(derivedDataPath)) {
      await fs.mkdir(derivedDataPath, { recursive: true });
      console.warn(
        `Created runner derived data directory: ${derivedDataPath}. ` +
          'Ensure the XCUITest runner has been built (xcodebuild build-for-testing).',
      );
    }

    const runnerOptions: RunnerOptions = {
      derivedDataPath,
      destination,
      timeoutMs: DEFAULT_RUNNER_PORT_TIMEOUT_MS,
    };

    const port = await startRunner(runnerOptions);
    console.log(`XCUITest runner started on port ${port}`);
    return port;
  }

  private async performHealthCheck(client: XCUITestClient): Promise<boolean> {
    console.log('Performing health check on XCUITest runner...');

    const isReady = await waitForReady(
      () => client.healthCheck(),
      DEFAULT_HEALTH_CHECK_TIMEOUT_MS,
    );

    if (isReady) {
      console.log('XCUITest runner is ready');
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
