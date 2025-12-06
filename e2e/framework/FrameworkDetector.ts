import { createLogger, Logger, LogLevel } from './logger';

/**
 * Testing framework context enum
 */
export enum TestFramework {
  DETOX = 'detox',
  APPIUM = 'appium',
}

/**
 * Framework detector - determines which testing framework is currently running
 */
export class FrameworkDetector {
  private static framework?: TestFramework;
  private static _logger: Logger | undefined;

  private static get logger(): Logger {
    if (!this._logger) {
      this._logger = createLogger({
        name: 'FrameworkDetector',
        level: LogLevel.DEBUG,
      });
    }
    return this._logger;
  }

  /**
   * Detect current framework based on environment
   */
  static detect(): TestFramework {
    if (this.framework) {
      return this.framework;
    }

    // Check for Detox globals
    if (process.env.E2E_FRAMEWORK === 'detox') {
      this.framework = TestFramework.DETOX;
      this.logger.debug('Detox framework detected.');
      return TestFramework.DETOX;
    }

    // Check for WebdriverIO globals
    if (process.env.E2E_FRAMEWORK === 'appium') {
      this.framework = TestFramework.APPIUM;
      this.logger.debug('Appium framework detected.');
      return TestFramework.APPIUM;
    }

    // Default to Detox for backwards compatibility
    this.framework = TestFramework.DETOX;
    this.logger.debug('Detox framework detected as default.');
    return TestFramework.DETOX;
  }

  /**
   * Manually set the framework (useful for testing or explicit configuration)
   */
  static setFramework(framework: TestFramework): void {
    this.framework = framework;
  }

  /**
   * Reset framework detection
   */
  static reset(): void {
    this.framework = undefined;
  }

  /**
   * Check if currently running on Detox
   */
  static isDetox(): boolean {
    return this.detect() === TestFramework.DETOX;
  }

  /**
   * Check if currently running on Appium/WebdriverIO
   */
  static isAppium(): boolean {
    return this.detect() === TestFramework.APPIUM;
  }
}
