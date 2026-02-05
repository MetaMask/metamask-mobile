/* eslint-disable import/no-nodejs-modules */
import { execSync } from 'child_process';
import DappServer from './DappServer.ts';
import { DappVariants, TestDapps } from './Constants.ts';
import { createLogger } from './logger.ts';

const logger = createLogger({
  name: 'StandaloneDappServer',
});

/**
 * Default port for standalone dapp servers.
 * This is a fallback port used when not using the full withFixtures flow.
 */
const DEFAULT_STANDALONE_PORT = 8090;

/**
 * StandaloneDappServer provides a simple wrapper around DappServer for use
 * in Appwright tests or other scenarios that don't use the full withFixtures flow.
 *
 * It handles:
 * - Starting/stopping the dapp server
 * - Platform-aware URL generation (Android 10.0.2.2 vs iOS localhost)
 * - ADB reverse port forwarding for Android
 *
 * @example
 * ```typescript
 * import { StandaloneDappServer, DappVariants } from '../tests/framework';
 *
 * const server = new StandaloneDappServer(DappVariants.BROWSER_PLAYGROUND);
 *
 * test.beforeAll(async () => {
 *   await server.start();
 * });
 *
 * test.afterAll(async () => {
 *   await server.stop();
 * });
 *
 * test('my test', async ({ device }) => {
 *   const url = server.getUrl(device.getPlatform());
 *   // Navigate to url...
 * });
 * ```
 */
export default class StandaloneDappServer {
  private _dappServer: DappServer;
  private _port: number;
  private _dappVariant: DappVariants;

  constructor(
    dappVariant: DappVariants,
    port: number = DEFAULT_STANDALONE_PORT,
  ) {
    this._dappVariant = dappVariant;
    this._port = port;

    const dappConfig = TestDapps[dappVariant];
    if (!dappConfig) {
      throw new Error(`Unknown dapp variant: ${dappVariant}`);
    }

    this._dappServer = new DappServer({
      dappCounter: 0,
      rootDirectory: dappConfig.dappPath,
      dappVariant,
    });

    // Set the port directly since we're not using PortManager
    this._dappServer.setServerPort(port);
  }

  /**
   * Start the dapp server.
   * Also sets up ADB reverse port forwarding for Android.
   */
  async start(): Promise<void> {
    if (this._dappServer.isStarted()) {
      logger.debug(
        `Standalone dapp server ${this._dappVariant} already running on port ${this._port}`,
      );
      return;
    }

    await this._dappServer.start();
    logger.debug(
      `Standalone dapp server ${this._dappVariant} started on port ${this._port}`,
    );

    // Set up ADB reverse for Android emulator access
    this._setupAndroidPortForwarding();
  }

  /**
   * Stop the dapp server.
   * Also cleans up ADB reverse port forwarding.
   */
  async stop(): Promise<void> {
    if (!this._dappServer.isStarted()) {
      logger.debug(
        `Standalone dapp server ${this._dappVariant} is not running`,
      );
      return;
    }

    // Clean up ADB reverse first
    this._cleanupAndroidPortForwarding();

    await this._dappServer.stop();
    logger.debug(`Standalone dapp server ${this._dappVariant} stopped`);
  }

  /**
   * Get the URL for accessing the dapp.
   * @param platform - 'android' or 'ios'
   * @returns The URL to access the dapp
   */
  getUrl(platform: 'android' | 'ios' = 'android'): string {
    if (platform === 'android') {
      // Android emulator accesses host machine via 10.0.2.2
      return `http://10.0.2.2:${this._port}`;
    }
    // iOS simulator can use localhost directly
    return `http://localhost:${this._port}`;
  }

  /**
   * Get the port the server is running on.
   */
  getPort(): number {
    return this._port;
  }

  /**
   * Check if the server is running.
   */
  isStarted(): boolean {
    return this._dappServer.isStarted();
  }

  /**
   * Set up ADB reverse port forwarding for Android emulator.
   * This allows the emulator to access localhost:{port} via 10.0.2.2:{port}
   */
  private _setupAndroidPortForwarding(): void {
    try {
      execSync(`adb reverse tcp:${this._port} tcp:${this._port}`, {
        stdio: 'pipe',
      });
      logger.debug(`ADB reverse port ${this._port} configured`);
    } catch (error) {
      // ADB might not be available (e.g., on iOS-only runs)
      logger.warn(
        `Could not set up ADB reverse (may be expected on iOS): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Clean up ADB reverse port forwarding.
   */
  private _cleanupAndroidPortForwarding(): void {
    try {
      execSync(`adb reverse --remove tcp:${this._port}`, { stdio: 'pipe' });
      logger.debug(`ADB reverse port ${this._port} removed`);
    } catch {
      // Ignore cleanup errors
    }
  }
}
