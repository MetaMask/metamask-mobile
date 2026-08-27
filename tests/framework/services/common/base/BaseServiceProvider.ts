import type { Browser } from 'webdriverio';
import type { ServiceProvider } from '../interfaces/ServiceProvider';
import type { ProjectConfig, CommonCapabilities } from '../types';
import { createLogger, type Logger } from '../../../logger';

/**
 * Base abstract class for service providers
 * Provides common functionality for all providers
 */
export abstract class BaseServiceProvider implements ServiceProvider {
  sessionId?: string;
  sessionCreationDurationMs?: number;
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
   * Deletes the WebDriver session when a browser is provided.
   * Providers that cache a browser (e.g. EmulatorProvider) should override
   * this so they can also clear their local reference.
   */
  async cleanupSession(drv?: Browser): Promise<void> {
    if (!drv) {
      this.sessionId = undefined;
      this.logger.debug(
        `Session cleanup for ${this.constructor.name}: no active session`,
      );
      return;
    }

    this.logger.debug(
      `Deleting WebDriver session ${drv.sessionId ?? this.sessionId ?? 'unknown'} (${this.constructor.name})`,
    );
    try {
      await drv.deleteSession();
      this.logger.info('WebDriver session deleted');
    } catch (error) {
      this.logger.error('Failed to delete WebDriver session:', error);
      throw error;
    } finally {
      this.sessionId = undefined;
    }
  }

  /**
   * Optional provider cleanup - override in subclasses if needed
   */
  async cleanupProvider?(): Promise<void> {
    this.logger.debug(`Provider cleanup for ${this.constructor.name}`);
  }

  /**
   * Legacy cleanup — prefer cleanupSession + cleanupProvider.
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
      'appium:app': this.project.use.app?.buildPath,
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
    const buildPath = this.project.use.app?.buildPath ?? '';
    return buildPath;
  }
}
