import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { SauceLabsConfigBuilder } from './SauceLabsConfigBuilder.ts';

export class SauceLabsProvider extends BaseServiceProvider {
  constructor(project: ProjectConfig) {
    super(project, 'SauceLabsProvider');
  }

  async globalSetup(): Promise<void> {
    await super.globalSetup?.();
    this.logger.info('Sauce Labs global setup complete');
  }

  async getDriver(): Promise<Browser> {
    const start = Date.now();
    const browser = await remote(
      new SauceLabsConfigBuilder(this.project).build(),
    );
    this.sessionCreationDurationMs = Date.now() - start;
    this.sessionId = browser.sessionId;
    this.logger.info(
      `Driver created for Sauce Labs with session: ${this.sessionId} ` +
        `(session creation took ${this.sessionCreationDurationMs}ms)`,
    );
    return browser;
  }
}
