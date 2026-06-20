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
  clearAndroidAdbUdidResolutionCache,
  resolveAndroidAdbUdidForDevice,
} from './android/resolveAndroidAdbUdid';
import {
  reinstallFromBuildPathForProject,
  shouldSkipAppReinstallFromEnv,
} from './reinstallLocalBuildFromPath';
import {
  startAndroidEmulator,
  ensureAndroidEmulatorReady,
  ensureIosSimulatorReady,
  getIosSimulatorUdid,
} from '../../appium/EmulatorHelpers';

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
          const expectedLine = `package:${packageName}`;
          const installed = stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .some((line) => line === expectedLine);
          resolve(installed);
        },
      );
    });
  }

  private async resolveIosSimulatorUdid(): Promise<string | undefined> {
    const emulatorDevice = this.project.use.device as EmulatorConfig;
    const deviceName = emulatorDevice?.name;
    const configuredUdid =
      emulatorDevice?.udid?.trim() || process.env.IOS_SIMULATOR_UDID?.trim();
    if (configuredUdid) {
      return configuredUdid;
    }
    if (!deviceName) {
      return undefined;
    }
    return getIosSimulatorUdid(deviceName).catch(() => deviceName);
  }

  /**
   * Check if the iOS app is installed on the device
   * @returns True if the app is installed, false otherwise
   */
  private async isIOSAppInstalled(): Promise<boolean> {
    const bundleId = this.project.use.app?.appId;
    const simId = await this.resolveIosSimulatorUdid();
    if (!simId || !bundleId) {
      this.logger.error(
        'No simulator UDID or bundle id specified in project config',
      );
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execFile } = require('child_process');
    return new Promise<boolean>((resolve) => {
      execFile(
        'xcrun',
        ['simctl', 'get_app_container', simId, bundleId],
        (error: Error | null, stdout: string) => {
          if (error) {
            this.logger.debug(
              `App with bundle id ${bundleId} NOT installed on simulator "${simId}". ${error.message}`,
            );
            resolve(false);
          } else {
            this.logger.debug(
              `App with bundle id ${bundleId} IS installed on simulator "${simId}". App container: ${stdout.trim()}`,
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
   * Persist adb serial across Playwright tests and retries in the same worker.
   */
  private persistAndroidEmulatorSerial(
    serial: string,
    emulatorDevice: EmulatorConfig,
  ): void {
    emulatorDevice.udid = serial;
    process.env.ANDROID_DEVICE_UDID = serial;
  }

  /**
   * Boot the configured device (emulator/simulator) if it is not already
   * running. Controlled by the SKIP_DEVICE_BOOT env var:
   *
   * - SKIP_DEVICE_BOOT=true  — skip booting (device must already be running)
   * - SKIP_DEVICE_BOOT=false — boot if needed (default)
   *
   * Booting must happen before any app-install steps because those use
   * adb / simctl which require a running device.
   */
  private async bootDevice(): Promise<void> {
    if (process.env.SKIP_DEVICE_BOOT === 'true') {
      this.logger.info('SKIP_DEVICE_BOOT=true — skipping device boot.');
      return;
    }

    if (this.project.use.platform === Platform.ANDROID) {
      const emulatorDevice = this.project.use.device as EmulatorConfig;
      const avdName = emulatorDevice.name;
      if (!avdName && !emulatorDevice.udid) {
        throw new Error(
          'Android device boot requires `use.device.name` (AVD name) or `use.device.udid` (adb serial) in the project config.',
        );
      }
      const serial = await ensureAndroidEmulatorReady(
        avdName ?? '',
        emulatorDevice.udid,
      );
      this.persistAndroidEmulatorSerial(serial, emulatorDevice);
    } else if (this.project.use.platform === Platform.IOS) {
      const deviceName = this.project.use.device?.name;
      if (!deviceName) {
        throw new Error(
          'iOS device boot requires `use.device.name` (simulator name) in the project config.',
        );
      }
      const udid = await ensureIosSimulatorReady(
        deviceName,
        (this.project.use.device as EmulatorConfig).udid,
      );
      // Persist the UDID onto the device config so Appium's XCUITest driver
      // targets this exact simulator (not a fresh one with the same display name).
      (this.project.use.device as EmulatorConfig).udid = udid;
    }
  }

  /**
   * Global setup: boots the device if needed, then validates the local build
   * artifact path, or checks that the app is already installed when `buildPath`
   * is unset. `SKIP_APP_REINSTALL` can skip adb/simctl uninstall+install when
   * `buildPath` is set. See
   * [PLAYWRIGHT_LOCAL_EMULATOR.md](../../../../docs/PLAYWRIGHT_LOCAL_EMULATOR.md).
   */
  async globalSetup(): Promise<void> {
    await super.globalSetup?.();

    // Boot the device first — adb/simctl calls below require a running device
    await this.bootDevice();

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
      if (
        shouldSkipAppReinstallFromEnv() &&
        this.project.use.platform === Platform.IOS
      ) {
        const isInstalled = await this.isIOSAppInstalled();
        if (!isInstalled) {
          throw new Error(
            `SKIP_APP_REINSTALL is enabled but ${this.project.use.app?.appId} is not installed on the target simulator. The prepare step may have failed to install the .app.`,
          );
        }
        this.logger.info(
          'Verified MetaMask is installed on the target iOS simulator.',
        );
      }
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

    const emulatorDevice = this.project.use.device as EmulatorConfig;

    if (this.project.use.platform === Platform.ANDROID) {
      if (!emulatorDevice.name && !emulatorDevice.udid) {
        throw new Error(
          'Android local emulator: set `use.device.name` (AVD name) or `use.device.udid` (e.g. emulator-5554).',
        );
      }
      // Re-ensure the emulator on every session (including Playwright retries).
      // globalSetup boots once; a failed test can leave adb offline until we wait or reboot.
      clearAndroidAdbUdidResolutionCache();
      const serial = await ensureAndroidEmulatorReady(
        emulatorDevice.name ?? '',
        emulatorDevice.udid,
      );
      this.persistAndroidEmulatorSerial(serial, emulatorDevice);
      await applyResolvedAndroidAdbToDevice(emulatorDevice, {
        setAndroidSerialEnv: true,
      });
    } else if (this.project.use.platform === Platform.IOS) {
      const deviceName = emulatorDevice.name;
      if (!deviceName) {
        throw new Error(
          'iOS local simulator: set `use.device.name` (simulator name) in the project config.',
        );
      }
      // Boot (or re-boot) before Appium session creation. CI sets IOS_SIMULATOR_UDID
      // from prepare-ios-appium-runner so we attach to the sim that received the .app.
      emulatorDevice.udid = await ensureIosSimulatorReady(
        deviceName,
        emulatorDevice.udid,
      );
      this.logger.debug(
        `iOS simulator ready for Appium (udid=${emulatorDevice.udid})`,
      );
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
