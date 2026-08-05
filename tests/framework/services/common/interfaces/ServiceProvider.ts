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
   * Populated by Emulator and BrowserStack providers after getDriver().
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
   * Deletes the active WebDriver session and clears session metadata.
   * Does not stop the Appium server.
   */
  cleanupSession?(drv?: Browser): Promise<void>;

  /**
   * Releases provider-level resources (e.g. stop local Appium server).
   * Does not delete the WebDriver session.
   */
  cleanupProvider?(): Promise<void>;

  /**
   * Legacy cleanup — prefer `cleanupSession` then `cleanupProvider`.
   * EmulatorProvider maps this to `cleanupProvider` only (historical behavior).
   */
  cleanup?(): Promise<void>;

  /**
   * Returns a recording URL for the given session (optional, provider-specific)
   */
  getRecordingUrl?(sessionId: string): Promise<string | null>;
}
