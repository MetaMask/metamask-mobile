import { FrameworkDetector } from './FrameworkDetector.ts';

/**
 * Platform detector for Appium/WebdriverIO, Detox, and Appwright context
 */
export class PlatformDetector {
  private static _platform?: 'android' | 'ios';

  /**
   * Manually set the platform (useful for Appwright where no globals exist).
   * Call this before any platform detection is needed.
   */
  static setPlatform(platform: 'android' | 'ios'): void {
    this._platform = platform;
  }

  /**
   * Get current platform (android/ios)
   */
  static async getPlatform(): Promise<'android' | 'ios'> {
    // Return manually set platform (used by Appwright)
    if (this._platform) {
      return this._platform;
    }

    if (FrameworkDetector.isDetox()) {
      return device.getPlatform() as 'android' | 'ios';
    }

    // For Appium/WebdriverIO
    if (typeof driver !== 'undefined') {
      const capabilities = await driver.capabilities;
      return capabilities.platformName?.toLowerCase() === 'android'
        ? 'android'
        : 'ios';
    }

    throw new Error('Unable to detect platform');
  }

  /**
   * Check if running on Android
   */
  static async isAndroid(): Promise<boolean> {
    return (await this.getPlatform()) === 'android';
  }

  /**
   * Check if running on iOS
   */
  static async isIOS(): Promise<boolean> {
    return (await this.getPlatform()) === 'ios';
  }
}
