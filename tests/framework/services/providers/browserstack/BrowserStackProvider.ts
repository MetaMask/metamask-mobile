import { remote, type Browser } from 'webdriverio';
// eslint-disable-next-line import-x/no-commonjs, @typescript-eslint/no-require-imports
const { Local } = require('browserstack-local');
import { BaseServiceProvider } from '../../common/base/BaseServiceProvider.ts';
import type { ProjectConfig } from '../../common/types.ts';
import { BrowserStackAPI } from './BrowserStackAPI.ts';
import { BrowserStackConfigBuilder } from './BrowserStackConfigBuilder.ts';

interface BrowserStackLocalTunnel {
  start(
    opts: Record<string, string | boolean>,
    cb: (err?: Error) => void,
  ): void;
  stop(cb: (err?: Error) => void): void;
  isRunning(): boolean;
}

/**
 * Service provider for BrowserStack cloud testing
 */
export class BrowserStackProvider extends BaseServiceProvider {
  private api: BrowserStackAPI;
  private static localTunnel: BrowserStackLocalTunnel | null = null;

  constructor(project: ProjectConfig) {
    super(project, 'BrowserStackProvider');
    this.api = new BrowserStackAPI();
  }

  /**
   * Global setup - validate BrowserStack configuration and start Local tunnel
   */
  async globalSetup(): Promise<void> {
    await super.globalSetup?.();

    if (
      process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true' &&
      !BrowserStackProvider.localTunnel
    ) {
      await this.startLocalTunnel();
    }

    this.logger.info('BrowserStack global setup complete');
  }

  /**
   * Start BrowserStack Local tunnel using the browserstack-local npm package
   */
  private async startLocalTunnel(): Promise<void> {
    const tunnel: BrowserStackLocalTunnel = new Local();
    const opts: Record<string, string | boolean> = {
      key: process.env.BROWSERSTACK_ACCESS_KEY ?? '',
    };

    if (process.env.BROWSERSTACK_LOCAL_IDENTIFIER) {
      opts.localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
    }

    this.logger.info('Starting BrowserStack Local tunnel...');

    await new Promise<void>((resolve, reject) => {
      tunnel.start(opts, (err?: Error) => {
        if (err) {
          reject(
            new Error(
              `BrowserStack Local tunnel failed to start: ${err.message}`,
            ),
          );
        } else {
          resolve();
        }
      });
    });

    BrowserStackProvider.localTunnel = tunnel;
    this.logger.info(
      `BrowserStack Local tunnel started (isRunning: ${tunnel.isRunning()})`,
    );
  }

  /**
   * Stop the BrowserStack Local tunnel. Called from globalTeardown.
   */
  static async stopLocalTunnel(): Promise<void> {
    const tunnel = BrowserStackProvider.localTunnel;
    if (!tunnel?.isRunning()) return;

    await new Promise<void>((resolve) => {
      tunnel.stop((err?: Error) => {
        if (err) {
          console.error(
            'Failed to stop BrowserStack Local tunnel:',
            err.message,
          );
        }
        resolve();
      });
    });

    BrowserStackProvider.localTunnel = null;
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
