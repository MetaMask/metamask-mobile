/* eslint-disable import-x/no-nodejs-modules */
import path from 'path';
import {
  formatCommandOutput,
  runDeviceCommand,
  type DeviceCommandOutput,
} from './commandRunner';
import type {
  ClearAppDataOptions,
  DeviceCommandHandlerOptions,
  InstallAppOptions,
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

  /**
   * Creates an Android command handler for a resolved local emulator/device.
   */
  constructor(options: DeviceCommandHandlerOptions) {
    this.options = options;
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
    const udid = this.options.currentDeviceDetails.udid?.trim();
    if (!udid) {
      throw new Error(
        'Android device commands require currentDeviceDetails.udid (adb serial).',
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
   * Converts unknown thrown values into loggable error text.
   */
  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
