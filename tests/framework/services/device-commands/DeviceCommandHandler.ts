import { AndroidDeviceCommandHandler } from './AndroidDeviceCommandHandler';
import { IOSDeviceCommandHandler } from './IOSDeviceCommandHandler';
import { createLogger } from '../../logger';
import type {
  ClearAppDataOptions,
  DeviceCommandHandlerOptions,
  InstallAppOptions,
  IsAppInstalledOptions,
  PlatformDeviceCommandHandler,
  ReinstallAppOptions,
  UninstallAppOptions,
} from './types';

/**
 * Delegates local device commands to the Android or iOS implementation for the current device.
 */
export class DeviceCommandHandler implements PlatformDeviceCommandHandler {
  private readonly platformHandler: PlatformDeviceCommandHandler;

  /**
   * Creates a platform-specific command handler from current device metadata.
   */
  constructor(options: DeviceCommandHandlerOptions) {
    this.platformHandler = this.createPlatformHandler({
      ...options,
      logger: options.logger ?? createLogger({ name: 'DeviceCommandHandler' }),
    });
  }

  /**
   * Installs the app artifact on the current local device.
   */
  installApp(options: InstallAppOptions): Promise<void> {
    return this.platformHandler.installApp(options);
  }

  /**
   * Uninstalls the app from the current local device.
   */
  uninstallApp(options?: UninstallAppOptions): Promise<void> {
    return this.platformHandler.uninstallApp(options);
  }

  /**
   * Reinstalls the app artifact on the current local device.
   */
  reinstallApp(options: ReinstallAppOptions): Promise<void> {
    return this.platformHandler.reinstallApp(options);
  }

  /**
   * Returns whether the app is installed on the current local device.
   */
  isAppInstalled(options?: IsAppInstalledOptions): Promise<boolean> {
    return this.platformHandler.isAppInstalled(options);
  }

  /**
   * Clears persisted app data on the current local device.
   */
  clearAppData(options?: ClearAppDataOptions): Promise<void> {
    return this.platformHandler.clearAppData(options);
  }

  /**
   * Selects the concrete platform handler and rejects unsupported remote providers.
   */
  private createPlatformHandler(
    options: DeviceCommandHandlerOptions,
  ): PlatformDeviceCommandHandler {
    if (options.currentDeviceDetails.isBrowserstack) {
      throw new Error(
        'DeviceCommandHandler only supports local emulator/simulator devices; BrowserStack does not expose adb/simctl access.',
      );
    }

    if (options.currentDeviceDetails.platform === 'android') {
      return new AndroidDeviceCommandHandler(options);
    }

    if (options.currentDeviceDetails.platform === 'ios') {
      return new IOSDeviceCommandHandler(options);
    }

    throw new Error(
      `Unsupported platform for device commands: ${String(
        options.currentDeviceDetails.platform,
      )}`,
    );
  }
}
