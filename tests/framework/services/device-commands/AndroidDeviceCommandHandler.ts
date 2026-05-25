/* eslint-disable import-x/no-nodejs-modules */
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
 * Android implementation of local device app-management commands backed by `adb`.
 */
export class AndroidDeviceCommandHandler
  implements PlatformDeviceCommandHandler
{
  private readonly options: DeviceCommandHandlerOptions;
  private readonly deviceId?: string;

  /**
   * Creates an Android command handler for a resolved local emulator/device.
   */
  constructor(options: DeviceCommandHandlerOptions) {
    this.options = options;
    this.deviceId = options.deviceId?.trim() || undefined;
  }

  /**
   * Installs an APK on the current Android device.
   */
  async installApp({ buildPath }: InstallAppOptions): Promise<void> {
    const resolvedBuildPath = this.resolveBuildPath(buildPath);
    const output = await this.runAdb(['install', resolvedBuildPath], {
      timeout: INSTALL_TIMEOUT_MS,
      maxBuffer: LARGE_OUTPUT_BUFFER,
    });
    const formattedOutput = formatCommandOutput(output);
    if (formattedOutput) {
      this.options.logger?.info(formattedOutput);
    }
  }

  /**
   * Uninstalls the Android package, optionally ignoring missing-package failures.
   */
  async uninstallApp({
    packageName,
    ignoreMissing = true,
  }: UninstallAppOptions = {}): Promise<void> {
    const resolvedPackageName = this.resolvePackageName(packageName);

    try {
      const output = await this.runAdb(['uninstall', resolvedPackageName], {
        timeout: PACKAGE_OPERATION_TIMEOUT_MS,
        maxBuffer: LARGE_OUTPUT_BUFFER,
      });
      this.options.logger?.debug(
        `adb uninstall ${resolvedPackageName}: ${
          formatCommandOutput(output) || 'done'
        }`,
      );
    } catch (error) {
      if (!ignoreMissing) {
        throw error;
      }
      this.options.logger?.debug(
        `adb uninstall (ignored if app was not installed): ${this.formatError(
          error,
        )}`,
      );
    }
  }

  /**
   * Reinstalls an APK by uninstalling the package first and then installing the artifact.
   */
  async reinstallApp(options: ReinstallAppOptions): Promise<void> {
    await this.uninstallApp({
      packageName: options.packageName,
      ignoreMissing: options.ignoreMissing ?? true,
    });
    await this.installApp({ buildPath: options.buildPath });
  }

  /**
   * Checks whether the Android package is present in `pm list packages` output.
   */
  async isAppInstalled({
    packageName,
  }: IsAppInstalledOptions = {}): Promise<boolean> {
    const resolvedPackageName = this.resolvePackageName(packageName);

    try {
      const { stdout } = await this.runAdb([
        'shell',
        'pm',
        'list',
        'packages',
        resolvedPackageName,
      ]);
      const expectedLine = `package:${resolvedPackageName}`;
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .some((line) => line === expectedLine);
    } catch (error) {
      this.options.logger?.debug(
        `adb package lookup failed for ${resolvedPackageName}: ${this.formatError(
          error,
        )}`,
      );
      return false;
    }
  }

  /**
   * Clears Android app data using `adb shell pm clear`.
   */
  async clearAppData({ packageName }: ClearAppDataOptions = {}): Promise<void> {
    const resolvedPackageName = this.resolvePackageName(packageName);
    const output = await this.runAdb(
      ['shell', 'pm', 'clear', resolvedPackageName],
      {
        timeout: PACKAGE_OPERATION_TIMEOUT_MS,
        maxBuffer: LARGE_OUTPUT_BUFFER,
      },
    );
    this.options.logger?.debug(
      `adb shell pm clear ${resolvedPackageName}: ${
        formatCommandOutput(output) || 'done'
      }`,
    );
  }

  /**
   * Installs a root certificate on Android. Not wired yet.
   */
  async installRootCertificate({
    certPath,
  }: InstallRootCertificateOptions): Promise<void> {
    throw new Error(
      `Android installRootCertificate is not implemented yet for ${certPath}.`,
    );
  }

  /**
   * Configures Android's global HTTP proxy.
   */
  async configureHttpProxy({
    host,
    port,
  }: ConfigureHttpProxyOptions): Promise<void> {
    const proxyHost = host.trim();
    this.validateProxyConfig(proxyHost, port);

    const proxyAddress = `${proxyHost}:${port}`;
    const output = await this.runAdb([
      'shell',
      'settings',
      'put',
      'global',
      'http_proxy',
      proxyAddress,
    ]);
    this.options.logger?.debug(
      `adb shell settings put global http_proxy ${proxyAddress}: ${
        formatCommandOutput(output) || 'done'
      }`,
    );
  }

  /**
   * Clears Android's global HTTP proxy.
   */
  async clearHttpProxy(): Promise<void> {
    const output = await this.runAdb([
      'shell',
      'settings',
      'put',
      'global',
      'http_proxy',
      ':0',
    ]);
    this.options.logger?.debug(
      `adb shell settings put global http_proxy :0: ${
        formatCommandOutput(output) || 'done'
      }`,
    );
  }

  /**
   * Runs an `adb` command scoped to the resolved Android serial.
   */
  private async runAdb(
    args: string[],
    commandOptions: { timeout?: number; maxBuffer?: number } = {},
  ): Promise<DeviceCommandOutput> {
    return runDeviceCommand('adb', ['-s', this.resolveAdbSerial(), ...args], {
      timeout: commandOptions.timeout ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: commandOptions.maxBuffer ?? 1024 * 1024,
    });
  }

  /**
   * Resolves the adb serial from current device details.
   */
  private resolveAdbSerial(): string {
    const udid =
      this.deviceId ?? this.options.currentDeviceDetails.udid?.trim();
    if (!udid) {
      throw new Error(
        'Android device commands require deviceId or currentDeviceDetails.udid (adb serial).',
      );
    }
    return udid;
  }

  /**
   * Resolves the Android package name from explicit options or current device details.
   */
  private resolvePackageName(packageName?: string): string {
    const resolvedPackageName =
      packageName?.trim() ??
      this.options.currentDeviceDetails.packageName?.trim();
    if (!resolvedPackageName) {
      throw new Error(
        'Android device commands require packageName or currentDeviceDetails.packageName.',
      );
    }
    return resolvedPackageName;
  }

  /**
   * Validates and resolves the APK build path.
   */
  private resolveBuildPath(buildPath: string): string {
    const trimmedBuildPath = buildPath.trim();
    if (!trimmedBuildPath) {
      throw new Error('Android installApp requires a non-empty buildPath.');
    }
    return path.resolve(trimmedBuildPath);
  }

  /**
   * Validates an Android proxy host and port.
   */
  private validateProxyConfig(host: string, port: number): void {
    if (!host) {
      throw new Error('Android configureHttpProxy requires a non-empty host.');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid Android HTTP proxy port: ${port}`);
    }
  }

  /**
   * Converts unknown thrown values into loggable error text.
   */
  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
