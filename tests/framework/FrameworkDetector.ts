import { createLogger, Logger, LogLevel } from './logger.ts';

/**
 * Testing framework context enum
 */
export enum TestFramework {
  DETOX = 'detox',
  APPIUM = 'appium',
}

// Declare globals that may exist at runtime
declare const device: unknown;
declare const driver: unknown;
declare const browser: unknown;

interface DriverGlobal {
  driver?: WebdriverIO.Browser;
}

/**
 * Framework detector - determines which testing framework is currently running
 *
 * Detection is automatic based on framework-specific globals:
 * - Detox: `device` global object
 * - Appium/WebdriverIO: `driver` or `browser` global objects
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
   * Check if Detox globals are available
   */
  private static hasDetoxGlobals(): boolean {
    try {
      return typeof device !== 'undefined' && device !== null;
    } catch {
      return false;
    }
  }

  /**
   * Check if WebdriverIO/Appium globals are available
   */
  private static hasAppiumGlobals(): boolean {
    try {
      const globalDriver = (globalThis as DriverGlobal).driver;
      return (
        (typeof globalDriver !== 'undefined' && globalDriver !== null) ||
        (typeof driver !== 'undefined' && driver !== null) ||
        (typeof browser !== 'undefined' && browser !== null)
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect current framework based on available globals
   *
   * Priority order:
   * 1. Cached framework (if already detected)
   * 2. Appium/WebdriverIO globals (driver/browser)
   * 3. Detox globals (device) — legacy; Detox runner removed (MMQA-2230)
   * 4. Default to Appium
   */
  static detect(): TestFramework {
    if (this.framework) {
      return this.framework;
    }

    if (this.hasAppiumGlobals()) {
      this.framework = TestFramework.APPIUM;
      this.logger.debug('Appium framework detected via driver/browser global.');
      return TestFramework.APPIUM;
    }

    if (this.hasDetoxGlobals()) {
      this.framework = TestFramework.DETOX;
      this.logger.debug('Detox framework detected via device global.');
      return TestFramework.DETOX;
    }

    this.framework = TestFramework.APPIUM;
    this.logger.debug('No framework globals detected, defaulting to Appium.');
    return TestFramework.APPIUM;
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
