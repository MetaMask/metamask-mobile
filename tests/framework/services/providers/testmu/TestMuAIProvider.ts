import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import {
  DEFAULT_BROWSERSTACK_SESSION_CREATE_MAX_ATTEMPTS,
  DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS,
} from '../../../Constants.ts';
import { TestMuAIAPI } from './TestMuAIAPI.ts';
import { TestMuAIConfigBuilder } from './TestMuAIConfigBuilder.ts';

/**
 * Only retry busy-grid / transport flakes. Do not match generic session
 * text that also appears for permanent failures (bad credentials, invalid app).
 */
const TRANSIENT_SESSION_ERROR_PATTERNS = [
  'aborted due to timeout',
  'operation was aborted',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'socket hang up',
  'network timeout',
  'All parallel tests are currently in use',
  'queue',
  'no device',
] as const;

const PERMANENT_SESSION_ERROR_PATTERNS = [
  'Invalid username',
  'Unauthorized',
  '401',
  '403',
  'App not found',
  'Invalid app',
  'LT_USERNAME',
  'LT_ACCESS_KEY',
  'buildPath is required',
  'not supported',
] as const;

function isTransientTestMuSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (
    PERMANENT_SESSION_ERROR_PATTERNS.some((pattern) =>
      message.includes(pattern),
    )
  ) {
    return false;
  }
  return TRANSIENT_SESSION_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

/**
 * Service provider for TestMu AI (LambdaTest) cloud testing.
 * HyperExecute tasks open Appium sessions through this provider.
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

  /**
   * Create a TestMu WebDriver session.
   * Retries transient hub/queue failures so one busy-grid abort does not
   * consume the Playwright retry budget.
   */
  async getDriver(): Promise<Browser> {
    this.logger.info(
      'Creating TestMu AI session (this can take several minutes on a busy grid)…',
    );

    const configBuilder = new TestMuAIConfigBuilder(this.project);
    const config = configBuilder.build();
    const appUrl = this.project.use.app?.buildPath ?? '<missing>';
    const deviceName = this.project.use.device?.name ?? '<missing>';
    const osVersion = this.project.use.device?.osVersion ?? '<missing>';
    const maxAttempts = DEFAULT_BROWSERSTACK_SESSION_CREATE_MAX_ATTEMPTS;

    this.logger.info(
      `TestMu AI session request: device=${deviceName}, os=${osVersion}, app=${appUrl}, host=${config.hostname}`,
    );

    const sessionCreationStart = Date.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const browser = await remote(config as Parameters<typeof remote>[0]);
        this.sessionCreationDurationMs = Date.now() - sessionCreationStart;
        this.sessionId = browser.sessionId;

        this.logger.info(
          `Driver created for TestMu AI with session: ${this.sessionId} ` +
            `(session creation took ${this.sessionCreationDurationMs}ms` +
            (attempt > 1 ? `, attempt ${attempt}/${maxAttempts}` : '') +
            `)`,
        );
        return browser;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isTransient = isTransientTestMuSessionError(error);
        this.sessionCreationDurationMs = Date.now() - sessionCreationStart;

        if (!isTransient || attempt === maxAttempts) {
          this.logger.error(
            `TestMu AI session creation failed after ${this.sessionCreationDurationMs}ms ` +
              `(attempt ${attempt}/${maxAttempts}, device=${deviceName}, os=${osVersion}, app=${appUrl}): ${message}`,
          );
          throw new Error(
            `TestMu AI WebDriver session creation failed after ${this.sessionCreationDurationMs}ms ` +
              `for ${deviceName}/${osVersion} app=${appUrl}. Underlying error: ${message}`,
            { cause: error },
          );
        }

        this.logger.warn(
          `TestMu AI session creation failed transiently ` +
            `(attempt ${attempt}/${maxAttempts}); retrying in ` +
            `${DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS}ms: ${message}`,
        );
        await new Promise((resolve) =>
          setTimeout(
            resolve,
            DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS,
          ),
        );
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
