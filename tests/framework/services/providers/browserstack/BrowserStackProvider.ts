import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { BrowserStackAPI } from './BrowserStackAPI.ts';
import { BrowserStackConfigBuilder } from './BrowserStackConfigBuilder.ts';

/**
 * Service provider for BrowserStack cloud testing
 */
export class BrowserStackProvider extends BaseServiceProvider {
  private api: BrowserStackAPI;

  constructor(project: ProjectConfig) {
    super(project, 'BrowserStackProvider');
    this.api = new BrowserStackAPI();
  }

  /**
   * Global setup - validate BrowserStack configuration
   */
  async globalSetup(): Promise<void> {
    await super.globalSetup?.();
    this.logger.info('BrowserStack global setup complete');
  }

  /**
   * Create and return WebDriver browser instance for BrowserStack
   */
  async getDriver(): Promise<Browser> {
    this.logger.debug('Creating driver for BrowserStack');

    const configBuilder = new BrowserStackConfigBuilder(this.project);
    const config = configBuilder.build();

    this.logger.info(
      `Requesting session with capabilities:\n${JSON.stringify(config.capabilities, null, 2)}`,
    );

    const browser = await remote(config);
    this.sessionId = browser.sessionId;

    this.logger.info(
      `Driver created for BrowserStack with session: ${this.sessionId}`,
    );
    this.logger.info(
      `Session capabilities returned:\n${JSON.stringify(browser.capabilities, null, 2)}`,
    );
    return browser;
  }

  /**
   * Returns the BrowserStack session recording URL
   */
  async getRecordingUrl(sessionId: string): Promise<string | null> {
    try {
      const details = await this.api.getSessionDetails(sessionId);
      if (!details?.buildId) return null;
      return this.api.buildSessionURL(details.buildId, sessionId);
    } catch {
      return null;
    }
  }

  /**
   * Update test details in BrowserStack
   */
  async syncTestDetails(details: {
    status?: string;
    reason?: string;
    name?: string;
  }): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session ID is not available');
    }

    await this.api.updateSession(this.sessionId, details);
  }
}
