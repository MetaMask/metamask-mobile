import type { CurrentDeviceDetails } from '../../fixture';
import type { Logger } from '../../logger';

/**
 * Logger surface used by device command handlers.
 */
export interface DeviceCommandLogger
  extends Pick<Logger, 'debug' | 'info' | 'warn' | 'error'> {}

/**
 * Shared constructor options for platform-specific device command handlers.
 */
export interface DeviceCommandHandlerOptions {
  currentDeviceDetails: CurrentDeviceDetails;
  logger?: DeviceCommandLogger;
}

/**
 * Options for installing an app artifact on the current local device.
 */
export interface InstallAppOptions {
  buildPath: string;
}

/**
 * Options for uninstalling an app from the current local device.
 */
export interface UninstallAppOptions {
  packageName?: string;
  appId?: string;
  ignoreMissing?: boolean;
}

/**
 * Options for checking whether an app is installed on the current local device.
 */
export interface IsAppInstalledOptions {
  packageName?: string;
  appId?: string;
}

/**
 * Options for clearing persisted app data on the current local device.
 */
export interface ClearAppDataOptions {
  packageName?: string;
  appId?: string;
}

/**
 * Options for reinstalling an app artifact on the current local device.
 */
export interface ReinstallAppOptions
  extends InstallAppOptions,
    UninstallAppOptions {}

/**
 * Platform-neutral command surface for local emulator/simulator app management.
 */
export interface PlatformDeviceCommandHandler {
  /**
   * Installs the app artifact from the provided build path.
   */
  installApp(options: InstallAppOptions): Promise<void>;

  /**
   * Uninstalls the app, optionally ignoring missing-install failures.
   */
  uninstallApp(options?: UninstallAppOptions): Promise<void>;

  /**
   * Uninstalls the app and then installs the artifact from the provided build path.
   */
  reinstallApp(options: ReinstallAppOptions): Promise<void>;

  /**
   * Returns whether the app is installed on the current device.
   */
  isAppInstalled(options?: IsAppInstalledOptions): Promise<boolean>;

  /**
   * Clears persisted app data without uninstalling the app.
   */
  clearAppData(options?: ClearAppDataOptions): Promise<void>;
}
