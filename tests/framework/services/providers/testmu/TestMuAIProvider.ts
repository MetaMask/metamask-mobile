import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { TestMuAIAPI } from './TestMuAIAPI.ts';
import { TestMuAIConfigBuilder } from './TestMuAIConfigBuilder.ts';

/**
 * Service provider for TestMu AI (formerly LambdaTest) cloud testing.
 */
export class TestMuAIProvider extends BaseServiceProvider {
  private api: TestMuAIAPI;

  constructor(project: ProjectConfig) {
    super(project, 'TestMuAIProvider');
    this.api = new TestMuAIAPI();
  }

  async globalSetup(): Promise<void> {
    await super.globalSetup?.();
    this.logger.info('TestMu AI global setup complete');
  }

  async getDriver(): Promise<Browser> {
    this.logger.info(
      'Creating TestMu AI session (this can take several minutes on a busy grid)…',
    );

    const configBuilder = new TestMuAIConfigBuilder(this.project);
    const config = configBuilder.build();

    const sessionCreationStart = Date.now();
    const browser = await remote(config as Parameters<typeof remote>[0]);
    this.sessionCreationDurationMs = Date.now() - sessionCreationStart;
    this.sessionId = browser.sessionId;

    this.logger.info(
      `Driver created for TestMu AI with session: ${this.sessionId} (session creation took ${this.sessionCreationDurationMs}ms)`,
    );
    return browser;
  }

  async getRecordingUrl(sessionId: string): Promise<string | null> {
    try {
      return await this.api.getVideoURL(sessionId);
    } catch {
      return this.api.buildSessionURL(sessionId);
    }
  }

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
