// eslint-disable-next-line import-x/no-nodejs-modules
import { writeFileSync, unlinkSync } from 'fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { resolve } from 'path';
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
   * Write .device-session file so @metamask/device-mcp can attach to this Appium session.
   */
  protected writeDeviceSession(
    appiumUrl: string,
    auth?: { user: string; key: string },
  ): void {
    if (!this.sessionId) {
      return;
    }
    const platform =
      this.project.use.platform === 'android' ? 'android' : 'ios';
    const sessionFile = resolve(process.cwd(), '.device-session');
    const content = JSON.stringify(
      {
        appiumUrl,
        sessionId: this.sessionId,
        platform,
        ...(auth ? { auth } : {}),
      },
      null,
      2,
    );
    writeFileSync(sessionFile, content, 'utf-8');
    this.logger.info(
      `Wrote .device-session for device-mcp (session: ${this.sessionId})`,
    );
  }

  protected removeDeviceSession(): void {
    try {
      unlinkSync(resolve(process.cwd(), '.device-session'));
      this.logger.debug('Removed .device-session');
    } catch {
      // expected when no session file exists
    }
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
