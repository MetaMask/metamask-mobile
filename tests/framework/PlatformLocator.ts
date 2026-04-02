import { FrameworkDetector } from './FrameworkDetector.ts';

/**
 * Platform detector for Appium/WebdriverIO and Detox context
 */
export class PlatformDetector {
  private static _platform: 'android' | 'ios' | undefined;

  /**
   * Get current platform (android/ios)
   */
  static async getPlatform(): Promise<'android' | 'ios'> {
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
   * Set the platform for the PlatformDetector.
   * @param platform - The platform to set
   */
  static setPlatform(platform: 'android' | 'ios'): void {
    this._platform = platform;
  }

  /**
   * Get the platform for the PlatformDetector.
   * @returns The platform
   */
  private static async _getPlatform(): Promise<'android' | 'ios'> {
    if (this._platform) {
      return this._platform;
    }
    return await this.getPlatform();
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
