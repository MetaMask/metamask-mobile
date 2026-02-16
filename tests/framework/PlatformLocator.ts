import { FrameworkDetector } from './FrameworkDetector.ts';

interface WebdriverGlobalDriver {
  capabilities: Promise<{ platformName?: string }>;
}

export class PlatformDetector {
  /**
   * Get current platform (android/ios)
   */
  static async getPlatform(): Promise<'android' | 'ios'> {
    if (FrameworkDetector.isDetox()) {
      return device.getPlatform() as 'android' | 'ios';
    }

    // For Appium/WebdriverIO
    const wdioDriver = (
      globalThis as typeof globalThis & {
        driver?: WebdriverGlobalDriver;
      }
    ).driver;

    if (wdioDriver) {
      const capabilities = await wdioDriver.capabilities;
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
