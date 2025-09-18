/**
 * Utility functions for BrowserStack credentials
 */
export class BrowserStackCredentials {
  /**
   * Get BrowserStack username from environment variables
   * @returns {string|null} BrowserStack username or null if not set
   */
  static getUsername() {
    return process.env.BROWSERSTACK_USERNAME || null;
  }

  /**
   * Get BrowserStack access key from environment variables
   * @returns {string|null} BrowserStack access key or null if not set
   */
  static getAccessKey() {
    return process.env.BROWSERSTACK_ACCESS_KEY || null;
  }

  /**
   * Get both BrowserStack credentials
   * @returns {Object} Object containing username and accessKey
   */
  static getCredentials() {
    return {
      username: this.getUsername(),
      accessKey: this.getAccessKey(),
    };
  }

  /**
   * Check if BrowserStack credentials are available
   * @returns {boolean} True if both username and access key are available
   */
  static hasCredentials() {
    const credentials = this.getCredentials();
    return !!(credentials.username && credentials.accessKey);
  }
}
