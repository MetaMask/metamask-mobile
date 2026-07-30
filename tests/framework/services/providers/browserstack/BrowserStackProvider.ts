import { remote, type Browser } from 'webdriverio';
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import {
  DEFAULT_BROWSERSTACK_SESSION_CREATE_MAX_ATTEMPTS,
  DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS,
} from '../../../Constants.ts';
import { BrowserStackAPI } from './BrowserStackAPI.ts';
import { BrowserStackConfigBuilder } from './BrowserStackConfigBuilder.ts';

/**
 * Only retry busy-grid / transport flakes. Do NOT match generic WDIO session
 * text like "Failed to create a session" or "wd/hub/session" — those also
 * appear for permanent failures (bad credentials, invalid app URL, caps).
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
  'All devices are busy',
  'DEVICE_QUEUE_TIMEOUT',
] as const;

const PERMANENT_SESSION_ERROR_PATTERNS = [
  'Invalid username or password',
  'Authentication failed',
  'Unauthorized',
  'App not found',
  'Invalid app',
  'app_url',
  'BROWSERSTACK_USERNAME',
  'BROWSERSTACK_ACCESS_KEY',
  'buildPath is required',
] as const;

function isTransientBrowserStackSessionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (
    PERMANENT_SESSION_ERROR_PATTERNS.some((pattern) =>
      message.includes(pattern),
    )
  ) {
    return false;
  }
  return TRANSIENT_SESSION_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern),
  );
}

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
   * Create and return WebDriver browser instance for BrowserStack.
   * Retries transient hub/session timeouts so a single busy-grid abort does
   * not consume the whole Playwright test retry budget.
   */
  async getDriver(): Promise<Browser> {
    this.logger.info(
      'Creating BrowserStack session (this can take several minutes on a busy grid)…',
    );

    const configBuilder = new BrowserStackConfigBuilder(this.project);
    const config = configBuilder.build();
    const maxAttempts = DEFAULT_BROWSERSTACK_SESSION_CREATE_MAX_ATTEMPTS;
    const sessionCreationStart = Date.now();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const browser = await remote(config);
        this.sessionCreationDurationMs = Date.now() - sessionCreationStart;
        this.sessionId = browser.sessionId;

        this.logger.info(
          `Driver created for BrowserStack with session: ${this.sessionId} ` +
            `(session creation took ${this.sessionCreationDurationMs}ms` +
            (attempt > 1 ? `, attempt ${attempt}/${maxAttempts}` : '') +
            `)`,
        );
        return browser;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isTransient = isTransientBrowserStackSessionError(error);

        if (!isTransient || attempt === maxAttempts) {
          this.logger.error(
            `BrowserStack session creation failed ` +
              `(attempt ${attempt}/${maxAttempts}` +
              `${isTransient ? ', transient' : ''}): ${message}`,
          );
          throw error;
        }

        this.logger.warn(
          `BrowserStack session creation failed transiently ` +
            `(attempt ${attempt}/${maxAttempts}); retrying in ` +
            `${DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS}ms: ${message}`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, DEFAULT_BROWSERSTACK_SESSION_CREATE_RETRY_DELAY_MS),
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError));
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
