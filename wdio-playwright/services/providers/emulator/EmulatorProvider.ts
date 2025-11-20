import { remote, type Browser } from 'webdriverio';
import { Platform } from '../../../../e2e/framework/types';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider';
import type { ProjectConfig } from '../../common/types';
import {
  installDriver,
  startAppiumServer,
  stopAppiumServer,
} from '../../appium';
import { EmulatorConfigBuilder } from './EmulatorConfigBuilder';

/**
 * Service provider for local emulator/simulator testing
 */
export class EmulatorProvider extends BaseServiceProvider {
  constructor(project: ProjectConfig) {
    super(project, 'EmulatorProvider');
  }

  /**
   * Global setup - validate emulator configuration
   */
  async globalSetup(): Promise<void> {
    await super.globalSetup?.();
    // TODO: Validate that the APK/IPA exists at the specified path
    this.logger.info('Emulator global setup complete');
  }

  /**
   * Create and return WebDriver browser instance for emulator
   */
  async getDriver(): Promise<Browser> {
    this.logger.debug('Creating driver for local emulator');

    // Install the appropriate Appium driver
    const driverName =
      this.getPlatform() === Platform.ANDROID ? 'uiautomator2' : 'xcuitest';
    await installDriver(driverName);

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
