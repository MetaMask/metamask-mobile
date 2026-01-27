import type { Browser } from 'webdriverio';
import type { ServiceProvider } from '../interfaces/ServiceProvider.ts';
import type { ProjectConfig, CommonCapabilities } from '../types.ts';
import { createLogger, type Logger } from '../../../logger.ts';

/**
 * Base abstract class for service providers
 * Provides common functionality for all providers
 */
export abstract class BaseServiceProvider implements ServiceProvider {
  sessionId?: string;
  protected readonly project: ProjectConfig;
  protected readonly logger: Logger;

  constructor(project: ProjectConfig, loggerName: string) {
    this.project = project;
    this.logger = createLogger({ name: loggerName });
  }

  /**
   * Abstract method - each provider implements their own driver creation
   */
  abstract getDriver(): Promise<Browser>;

  /**
   * Optional global setup - override in subclasses if needed
   */
  async globalSetup?(): Promise<void> {
    this.logger.debug(`Global setup for ${this.constructor.name}`);
  }

  /**
   * Optional cleanup - override in subclasses if needed
   */
  async cleanup?(): Promise<void> {
    this.logger.debug(`Cleanup for ${this.constructor.name}`);
  }

  /**
   * Build common Appium capabilities used by all providers
   */
  protected buildCommonCapabilities(): CommonCapabilities {
    return {
      'appium:deviceName': this.project.use.device?.name,
      'appium:autoGrantPermissions': true,
      'appium:app': this.project.use.buildPath,
      'appium:autoAcceptAlerts': true,
      'appium:fullReset': true,
      'appium:deviceOrientation': this.project.use.device?.orientation,
      'appium:settings[snapshotMaxDepth]': 62,
      platformName: this.project.use.platform,
    };
  }

  /**
   * Get platform name from project config
   */
  protected getPlatform(): string | undefined {
    return this.project.use.platform;
  }

  /**
   * Get build path from project config
   */
  protected getBuildPath(): string {
    const buildPath = this.project.use.buildPath;
    if (!buildPath) {
      throw new Error('Build path is not configured');
    }
    return buildPath;
  }
}
