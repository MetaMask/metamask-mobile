/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs/promises';
import path from 'path';
import {
  formatCommandOutput,
  runDeviceCommand,
  type DeviceCommandOutput,
} from './commandRunner';
import type {
  ClearAppDataOptions,
  ConfigureHttpProxyOptions,
  DeviceCommandHandlerOptions,
  InstallAppOptions,
  InstallRootCertificateOptions,
  IsAppInstalledOptions,
  PlatformDeviceCommandHandler,
  ReinstallAppOptions,
  UninstallAppOptions,
} from './types';

const DEFAULT_TIMEOUT_MS = 20_000;
const PACKAGE_OPERATION_TIMEOUT_MS = 120_000;
const INSTALL_TIMEOUT_MS = 10 * 60_000;
const LARGE_OUTPUT_BUFFER = 2 * 1024 * 1024;

/**
 * iOS implementation of local simulator app-management commands backed by `simctl`.
 */
export class IOSDeviceCommandHandler implements PlatformDeviceCommandHandler {
  private readonly options: DeviceCommandHandlerOptions;
  private readonly deviceId?: string;

  /**
   * Creates an iOS command handler for a local simulator.
   */
  constructor(options: DeviceCommandHandlerOptions) {
    this.options = options;
    this.deviceId = options.deviceId?.trim() || undefined;
  }

  /**
   * Installs an `.app` bundle on the current iOS simulator.
   */
  async installApp({ buildPath }: InstallAppOptions): Promise<void> {
    const resolvedBuildPath = this.resolveBuildPath(buildPath);
    const output = await this.runSimctl(
      ['install', this.resolveSimDevice(), resolvedBuildPath],
      {
        timeout: INSTALL_TIMEOUT_MS,
        maxBuffer: LARGE_OUTPUT_BUFFER,
      },
    );
    const formattedOutput = formatCommandOutput(output);
    if (formattedOutput) {
      this.options.logger?.info(formattedOutput);
    }
  }

  /**
   * Uninstalls the iOS app, optionally ignoring missing-app failures.
   */
  async uninstallApp({
    appId,
    ignoreMissing = true,
  }: UninstallAppOptions = {}): Promise<void> {
    const resolvedAppId = this.resolveAppId(appId);

    try {
      const output = await this.runSimctl(
        ['uninstall', this.resolveSimDevice(), resolvedAppId],
        {
          timeout: PACKAGE_OPERATION_TIMEOUT_MS,
          maxBuffer: LARGE_OUTPUT_BUFFER,
        },
      );
      this.options.logger?.debug(
        `simctl uninstall ${resolvedAppId}: ${
          formatCommandOutput(output) || 'done'
        }`,
      );
    } catch (error) {
      if (!ignoreMissing) {
        throw error;
      }
      this.options.logger?.debug(
        `simctl uninstall (ignored if app was not installed): ${this.formatError(
          error,
        )}`,
      );
    }
  }

  /**
   * Reinstalls an `.app` bundle by uninstalling first and then installing the artifact.
   */
  async reinstallApp(options: ReinstallAppOptions): Promise<void> {
    await this.uninstallApp({
      appId: options.appId,
      ignoreMissing: options.ignoreMissing ?? true,
    });
    await this.installApp({ buildPath: options.buildPath });
  }

  /**
   * Checks whether the iOS app has a simulator app container.
   */
  async isAppInstalled({
    appId,
  }: IsAppInstalledOptions = {}): Promise<boolean> {
    const resolvedAppId = this.resolveAppId(appId);

    try {
      const { stdout } = await this.runSimctl([
        'get_app_container',
        this.resolveSimDevice(),
        resolvedAppId,
      ]);
      return stdout.trim().length > 0;
    } catch (error) {
      this.options.logger?.debug(
        `simctl app container lookup failed for ${resolvedAppId}: ${this.formatError(
          error,
        )}`,
      );
      return false;
    }
  }

  /**
   * Terminates the app and clears its simulator data container contents.
   */
  async clearAppData({ appId }: ClearAppDataOptions = {}): Promise<void> {
    const resolvedAppId = this.resolveAppId(appId);
    const simDevice = this.resolveSimDevice();
    await this.terminateAppIfRunning(simDevice, resolvedAppId);

    const { stdout } = await this.runSimctl([
      'get_app_container',
      simDevice,
      resolvedAppId,
      'data',
    ]);
    const appDataPath = stdout.trim();
    this.validateAppDataPath(appDataPath, resolvedAppId);

    const entries = await fs.readdir(appDataPath);
    await Promise.all(
      entries.map((entry) =>
        fs.rm(path.join(appDataPath, entry), {
          recursive: true,
          force: true,
        }),
      ),
    );
    this.options.logger?.debug(`Cleared iOS app data at ${appDataPath}`);
  }

  /**
   * Boots the simulator if needed and installs a root certificate into its keychain.
   */
  async installRootCertificate({
    certPath,
  }: InstallRootCertificateOptions): Promise<void> {
    const resolvedCertPath = this.resolveCertificatePath(certPath);
    const simDevice = this.resolveSimDevice();

    await this.bootSimulator(simDevice);
    const output = await this.runSimctl([
      'keychain',
      simDevice,
      'add-root-cert',
      resolvedCertPath,
    ]);
    const formattedOutput = formatCommandOutput(output);
    if (formattedOutput) {
      this.options.logger?.debug(formattedOutput);
    }
  }

  /**
   * iOS proxying is currently configured through app launch arguments.
   */
  async configureHttpProxy({
    host,
    port,
  }: ConfigureHttpProxyOptions): Promise<void> {
    throw new Error(
      `iOS configureHttpProxy is not implemented for ${host}:${port}; use app launch arguments instead.`,
    );
  }

  /**
   * iOS proxying is currently configured through app launch arguments.
   */
  async clearHttpProxy(): Promise<void> {
    throw new Error(
      'iOS clearHttpProxy is not implemented; proxying is controlled by app launch arguments.',
    );
  }

  /**
   * Boots the simulator and waits for it to finish booting.
   */
  private async bootSimulator(simDevice: string): Promise<void> {
    try {
      await this.runSimctl(['boot', simDevice]);
    } catch (error) {
      if (!this.isAlreadyBootedError(error)) {
        throw error;
      }
    }

    try {
      await this.runSimctl(['bootstatus', simDevice, '-b']);
    } catch (error) {
      this.options.logger?.warn(
        `simctl bootstatus failed for ${simDevice}: ${this.formatError(error)}`,
      );
    }
  }

  /**
   * Terminates the iOS app if it is running; missing/race failures are non-fatal.
   */
  private async terminateAppIfRunning(
    simDevice: string,
    appId: string,
  ): Promise<void> {
    try {
      const output = await this.runSimctl(['terminate', simDevice, appId], {
        timeout: PACKAGE_OPERATION_TIMEOUT_MS,
        maxBuffer: LARGE_OUTPUT_BUFFER,
      });
      this.options.logger?.debug(
        `simctl terminate ${appId}: ${formatCommandOutput(output) || 'done'}`,
      );
    } catch (error) {
      this.options.logger?.debug(
        `simctl terminate (ignored if app was not running): ${this.formatError(
          error,
        )}`,
      );
    }
  }

  /**
   * Runs an `xcrun simctl` command.
   */
  private async runSimctl(
    args: string[],
    commandOptions: { timeout?: number; maxBuffer?: number } = {},
  ): Promise<DeviceCommandOutput> {
    return runDeviceCommand('xcrun', ['simctl', ...args], {
      timeout: commandOptions.timeout ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: commandOptions.maxBuffer ?? 1024 * 1024,
    });
  }

  /**
   * Resolves the simulator name or UDID from current device details.
   */
  private resolveSimDevice(): string {
    const deviceName =
      this.deviceId ?? this.options.currentDeviceDetails.deviceName?.trim();
    if (!deviceName) {
      throw new Error(
        'iOS device commands require deviceId or currentDeviceDetails.deviceName (simctl device name or UDID).',
      );
    }
    return deviceName;
  }

  /**
   * Resolves the iOS bundle id from explicit options or current device details.
   */
  private resolveAppId(appId?: string): string {
    const resolvedAppId =
      appId?.trim() ?? this.options.currentDeviceDetails.appId?.trim();
    if (!resolvedAppId) {
      throw new Error(
        'iOS device commands require appId or currentDeviceDetails.appId.',
      );
    }
    return resolvedAppId;
  }

  /**
   * Validates and resolves the `.app` build path.
   */
  private resolveBuildPath(buildPath: string): string {
    const trimmedBuildPath = buildPath.trim();
    if (!trimmedBuildPath) {
      throw new Error('iOS installApp requires a non-empty buildPath.');
    }
    return path.resolve(trimmedBuildPath);
  }

  /**
   * Validates and resolves the certificate path.
   */
  private resolveCertificatePath(certPath: string): string {
    const trimmedCertPath = certPath.trim();
    if (!trimmedCertPath) {
      throw new Error(
        'iOS installRootCertificate requires a non-empty certPath.',
      );
    }
    return path.resolve(trimmedCertPath);
  }

  /**
   * Rejects empty or unsafe paths before removing simulator data-container contents.
   */
  private validateAppDataPath(appDataPath: string, appId: string): void {
    if (!appDataPath) {
      throw new Error(
        `Could not resolve iOS app data container for appId "${appId}".`,
      );
    }

    const parsedPath = path.parse(appDataPath);
    if (appDataPath === parsedPath.root) {
      throw new Error(
        `Refusing to clear unsafe iOS app data path "${appDataPath}".`,
      );
    }

    if (!appDataPath.includes('/Containers/Data/Application/')) {
      throw new Error(
        `Refusing to clear non-app-container iOS data path "${appDataPath}".`,
      );
    }
  }

  /**
   * Converts unknown thrown values into loggable error text.
   */
  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Returns whether simctl reported that the simulator is already booted.
   */
  private isAlreadyBootedError(error: unknown): boolean {
    const message = this.formatError(error);
    return (
      message.includes('Unable to boot device in current state') ||
      message.includes('current state: Booted')
    );
  }
}
