/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider';
import type { ProjectConfig } from '../../common/types';
import { startAppiumServer, stopAppiumServer } from '../../appium';
import { EmulatorConfigBuilder } from './EmulatorConfigBuilder';
import { Platform, type EmulatorConfig } from '../../../types';
import {
  applyResolvedAndroidAdbToDevice,
  resolveAndroidAdbUdidForDevice,
} from './android/resolveAndroidAdbUdid';
import { reinstallFromBuildPathForProject } from './reinstallLocalBuildFromPath';

/**
 * Service provider for local emulator/simulator testing
 */
export class EmulatorProvider extends BaseServiceProvider {
  constructor(project: ProjectConfig) {
    super(project, 'EmulatorProvider');
  }

  /**
   * @param adbSerial ADB serial, e.g. `emulator-5554` (not the AVD display name).
   */
  private async isAndroidAppInstalled(
    packageName: string,
    adbSerial: string,
  ): Promise<boolean> {
    this.logger.debug(
      `Checking if Android app ${packageName} is installed on device ${adbSerial}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { exec } = require('child_process');
    return new Promise<boolean>((resolve) => {
      exec(
        `adb -s ${adbSerial} shell pm list packages ${packageName}`,
        (error: Error | null, stdout: string) => {
          if (error) {
            this.logger.error(`Error executing adb: ${error.message}`);
            resolve(false);
            return;
          }
          resolve(stdout.includes(`package:${packageName}`));
        },
      );
    });
  }

  /**
   * Check if the iOS app is installed on the device
   * @returns True if the app is installed, false otherwise
   */
  private async isIOSAppInstalled(): Promise<boolean> {
    const bundleId = this.project.use.app?.appId;
    const deviceName = this.project.use.device?.name;
    if (!deviceName || !bundleId) {
      this.logger.error(
        'No device name or bundle id specified in project config',
      );
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { exec } = require('child_process');
    return new Promise<boolean>((resolve) => {
      // List installed apps on the given simulator and look for the bundle id
      exec(
        `xcrun simctl get_app_container "${deviceName}" "${bundleId}"`,
        (error: Error | null, stdout: string) => {
          if (error) {
            // If there's an error, assume app is not installed
            this.logger.debug(
              `App with bundle id ${bundleId} NOT installed on simulator "${deviceName}". ${error.message}`,
            );
            resolve(false);
          } else {
            // If stdout contains a path, the app is installed
            this.logger.debug(
              `App with bundle id ${bundleId} IS installed on simulator "${deviceName}". App container: ${stdout.trim()}`,
            );
            resolve(true);
          }
        },
      );
    });
  }

  /**
   * Check if the app is installed on the device
   * @returns True if the app is installed, false otherwise
   */
  private async isAppInstalled(): Promise<boolean> {
    if (this.project.use.platform === Platform.ANDROID) {
      const emulatorDevice = this.project.use.device as EmulatorConfig;
      const packageName = this.project.use.app?.packageName;
      if (!packageName) {
        this.logger.error('No package name specified in project config');
        return false;
      }
      if (!emulatorDevice.name && !emulatorDevice.udid) {
        this.logger.error(
          'No `use.device.name` (AVD) or `use.device.udid` (adb serial) specified in project config',
        );
        return false;
      }
      const adbSerial = await resolveAndroidAdbUdidForDevice(emulatorDevice);
      return this.isAndroidAppInstalled(packageName, adbSerial);
    } else if (this.project.use.platform === Platform.IOS) {
      return this.isIOSAppInstalled();
    }
    return false;
  }

  /**
   * Global setup: validates local build artifact path, or that the app is
   * already installed when `buildPath` is unset. `SKIP_APP_REINSTALL` can skip
   * adb/simctl uninstall+install when `buildPath` is set. See
   * [PLAYWRIGHT_LOCAL_EMULATOR.md](../../../../docs/PLAYWRIGHT_LOCAL_EMULATOR.md).
   */
  async globalSetup(): Promise<void> {
    await super.globalSetup?.();

    if (this.project.use.app?.buildPath) {
      this.logger.debug(
        `Validating build path: ${this.project.use.app?.buildPath}`,
      );
      const buildPath = this.project.use.app?.buildPath;
      if (!fs.existsSync(buildPath)) {
        throw new Error(`Build path ${buildPath} does not exist`);
      }
      this.logger.debug(`Build path ${buildPath} is present on disk`);
      await reinstallFromBuildPathForProject(
        this.project,
        buildPath,
        this.logger,
      );
    } else {
      const isInstalled = await this.isAppInstalled();
      if (!isInstalled) {
        throw new Error(
          'App is not installed on the device and no build path provided. Run the app on the device or provide a build path (.app for iOS, .apk for Android)',
        );
      }
      this.logger.info('App is installed on the device');
    }

    this.logger.debug('Emulator global setup complete');
  }

  /**
   * Create and return WebDriver browser instance for emulator
   */
  async getDriver(): Promise<Browser> {
    this.logger.debug('Creating driver for local emulator');

    if (this.project.use.platform === Platform.ANDROID) {
      const emulatorDevice = this.project.use.device as EmulatorConfig;
      if (!emulatorDevice.name && !emulatorDevice.udid) {
        throw new Error(
          'Android local emulator: set `use.device.name` (AVD name) or `use.device.udid` (e.g. emulator-5554).',
        );
      }
      await applyResolvedAndroidAdbToDevice(emulatorDevice, {
        setAndroidSerialEnv: true,
      });
    }

    // Start Appium server
    await startAppiumServer();

    // Build configuration and create driver
    const configBuilder = new EmulatorConfigBuilder(this.project);
    const config = configBuilder.build();

    const browser = await remote(config);
    this.sessionId = browser.sessionId;

    this.logger.info(
      `Driver created for emulator with session: ${this.sessionId}`,
    );
    return browser;
  }

  /**
   * Cleanup - stop the Appium server
   */
  async cleanup(): Promise<void> {
    this.logger.debug('Cleaning up emulator provider');
    try {
      await stopAppiumServer();
      this.logger.info('Appium server stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop Appium server:', error);
      throw error;
    }
  }
}
