import type { Browser } from 'webdriverio';

/**
 * Service provider interface for different testing environments
 * (Emulator, BrowserStack, etc.)
 */
export interface ServiceProvider {
  /**
   * Identifier for the Appium session. Undefined if session not created.
   */
  sessionId?: string;

  /**
   * Time in milliseconds from session creation request to session ready.
   * Only populated by providers that involve remote session allocation (e.g. BrowserStack).
   */
  sessionCreationDurationMs?: number;

  /**
   * Global setup - validates configuration before tests run
   */
  globalSetup?(): Promise<void>;

  /**
   * Creates and returns a WebDriver browser instance
   */
  getDriver(): Promise<Browser>;

  /**
   * Updates test details and status (optional, provider-specific)
   */
  syncTestDetails?(details: {
    status?: string;
    reason?: string;
    name?: string;
  }): Promise<void>;

  /**
   * Cleanup resources (optional)
   */
  cleanup?(): Promise<void>;

  /**
   * Returns a recording URL for the given session (optional, provider-specific)
   */
  getRecordingUrl?(sessionId: string): Promise<string | null>;
}
