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
const ANDROID_USER_CA_DIRECTORY = '/data/misc/user/0/cacerts-added';
const ANDROID_LEGACY_HTTP_PROXY_SETTING = 'http_proxy';
const ANDROID_GLOBAL_HTTP_PROXY_HOST_SETTING = 'global_http_proxy_host';
const ANDROID_GLOBAL_HTTP_PROXY_PORT_SETTING = 'global_http_proxy_port';
const ANDROID_GLOBAL_HTTP_PROXY_EXCLUSION_LIST_SETTING =
  'global_http_proxy_exclusion_list';
const ANDROID_GLOBAL_HTTP_PROXY_PAC_SETTING = 'global_proxy_pac_url';
const DEFAULT_ANDROID_PROXY_EXCLUSION_LIST = [
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '10.0.3.2',
  'bs-local.com',
  '*.local',
];

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
   * Installs a root certificate into Android's user CA store.
   *
   * Debug builds trust this store through android/app/src/debug/res/xml/network_security_config.xml.
   */
  async installRootCertificate({
    certPath,
  }: InstallRootCertificateOptions): Promise<void> {
    const resolvedCertPath = this.resolveCertificatePath(certPath);
    const certHash =
      await this.getAndroidCertificateSubjectHash(resolvedCertPath);
    const deviceCertPath = `${ANDROID_USER_CA_DIRECTORY}/${certHash}.0`;

    await this.restartAdbAsRoot();
    await this.runAdb(['shell', 'mkdir', '-p', ANDROID_USER_CA_DIRECTORY]);
    await this.runAdb(['push', resolvedCertPath, deviceCertPath], {
      timeout: PACKAGE_OPERATION_TIMEOUT_MS,
      maxBuffer: LARGE_OUTPUT_BUFFER,
    });
    await this.runAdb(['shell', 'chmod', '644', deviceCertPath]);
    await this.runAdb(['shell', 'chown', 'system:system', deviceCertPath]);
    await this.restoreCertificateContext(deviceCertPath);

    this.options.logger?.debug(
      `Installed Android root certificate ${resolvedCertPath} at ${deviceCertPath}`,
    );
  }

  /**
   * Configures Android's global HTTP proxy.
   */
  async configureHttpProxy({
    host,
    port,
    exclusionList,
  }: ConfigureHttpProxyOptions): Promise<void> {
    const proxyHost = host.trim();
    this.validateProxyConfig(proxyHost, port);

    const proxyAddress = `${proxyHost}:${port}`;
    const proxyExclusionList = this.normalizeProxyExclusionList(exclusionList);

    await this.putGlobalSetting(
      ANDROID_GLOBAL_HTTP_PROXY_HOST_SETTING,
      proxyHost,
    );
    await this.putGlobalSetting(
      ANDROID_GLOBAL_HTTP_PROXY_PORT_SETTING,
      `${port}`,
    );
    await this.putGlobalSetting(
      ANDROID_GLOBAL_HTTP_PROXY_EXCLUSION_LIST_SETTING,
      proxyExclusionList,
    );
    await this.putGlobalSetting(ANDROID_GLOBAL_HTTP_PROXY_PAC_SETTING, '');
    const output = await this.putGlobalSetting(
      ANDROID_LEGACY_HTTP_PROXY_SETTING,
      proxyAddress,
    );
    this.options.logger?.debug(
      `adb shell settings put global http_proxy ${proxyAddress} with exclusions ${proxyExclusionList}: ${
        formatCommandOutput(output) || 'done'
      }`,
    );
  }

  /**
   * Clears Android's global HTTP proxy.
   */
  async clearHttpProxy(): Promise<void> {
    const output = await this.putGlobalSetting(
      ANDROID_LEGACY_HTTP_PROXY_SETTING,
      ':0',
    );
    await this.putGlobalSetting(ANDROID_GLOBAL_HTTP_PROXY_HOST_SETTING, '');
    await this.putGlobalSetting(ANDROID_GLOBAL_HTTP_PROXY_PORT_SETTING, '0');
    await this.putGlobalSetting(
      ANDROID_GLOBAL_HTTP_PROXY_EXCLUSION_LIST_SETTING,
      '',
    );
    await this.putGlobalSetting(ANDROID_GLOBAL_HTTP_PROXY_PAC_SETTING, '');
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
   * Writes a global Android setting through adb.
   */
  private async putGlobalSetting(
    key: string,
    value: string,
  ): Promise<DeviceCommandOutput> {
    return this.runAdb(['shell', 'settings', 'put', 'global', key, value]);
  }

  /**
   * Restarts adbd as root so the user CA store can be written without UI.
   */
  private async restartAdbAsRoot(): Promise<void> {
    const output = await this.runAdb(['root'], {
      timeout: PACKAGE_OPERATION_TIMEOUT_MS,
    });
    const formattedOutput = formatCommandOutput(output);

    if (/cannot run as root/i.test(formattedOutput)) {
      throw new Error(
        `Android root certificate installation requires adb root. Use a local emulator image that supports adb root or preinstall the proxy CA. adb root output: ${formattedOutput}`,
      );
    }

    await this.runAdb(['wait-for-device'], {
      timeout: PACKAGE_OPERATION_TIMEOUT_MS,
    });
  }

  /**
   * Computes the Android CA-store filename hash for a PEM certificate.
   */
  private async getAndroidCertificateSubjectHash(
    certPath: string,
  ): Promise<string> {
    const output = await runDeviceCommand(
      'openssl',
      ['x509', '-subject_hash_old', '-in', certPath, '-noout'],
      {
        timeout: DEFAULT_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      },
    );
    const certHash = output.stdout.trim().split(/\r?\n/)[0]?.trim();

    if (!certHash) {
      throw new Error(
        `Could not compute Android certificate subject hash for ${certPath}.`,
      );
    }

    return certHash;
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
   * Validates and resolves a local certificate path.
   */
  private resolveCertificatePath(certPath: string): string {
    const trimmedCertPath = certPath.trim();
    if (!trimmedCertPath) {
      throw new Error(
        'Android installRootCertificate requires a non-empty certPath.',
      );
    }
    return path.resolve(trimmedCertPath);
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
   * Builds the Android comma-separated proxy exclusion list.
   */
  private normalizeProxyExclusionList(exclusionList?: string[]): string {
    const entries =
      exclusionList && exclusionList.length > 0
        ? exclusionList
        : DEFAULT_ANDROID_PROXY_EXCLUSION_LIST;
    const normalizedEntries = entries
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const entry of normalizedEntries) {
      if (entry.includes(',')) {
        throw new Error(
          `Android proxy exclusion entries cannot contain commas: ${entry}`,
        );
      }
    }

    return Array.from(new Set(normalizedEntries)).join(',');
  }

  /**
   * Restores SELinux context when the command is available on the device.
   */
  private async restoreCertificateContext(
    deviceCertPath: string,
  ): Promise<void> {
    try {
      await this.runAdb(['shell', 'restorecon', deviceCertPath]);
    } catch (error) {
      this.options.logger?.debug(
        `adb shell restorecon ${deviceCertPath} failed: ${this.formatError(
          error,
        )}`,
      );
    }
  }

  /**
   * Converts unknown thrown values into loggable error text.
   */
  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
