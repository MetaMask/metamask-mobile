import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider';
import type { ProjectConfig } from '../../common/types';
import { BrowserStackAPI } from './BrowserStackAPI';
import { BrowserStackConfigBuilder } from './BrowserStackConfigBuilder';

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
    // TODO: Verify that the bs:// app exists in BrowserStack and is valid
    this.logger.info('BrowserStack global setup complete');
  }

  /**
   * Create and return WebDriver browser instance for BrowserStack
   */
  async getDriver(): Promise<Browser> {
    this.logger.debug('Creating driver for BrowserStack');

    const configBuilder = new BrowserStackConfigBuilder(this.project);
    const config = configBuilder.build();

    const browser = await remote(config);
    this.sessionId = browser.sessionId;

    this.logger.info(
      `Driver created for BrowserStack with session: ${this.sessionId}`,
    );
    return browser;
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
