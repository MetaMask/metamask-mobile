import { FrameworkDetector } from './FrameworkDetector.ts';
import { getPlatform as getCachedPlatform } from './DeviceInfoCache.ts';

/**
 * Platform detector for Appium/WebdriverIO and Detox context
 * Uses cached device info to avoid repeated HTTP calls to the Appium server.
 */
export class PlatformDetector {
  /**
   * Get current platform (android/ios).
   * For Appium/WebdriverIO, reads from the cached device info populated once in the fixture.
   * For Detox, reads from the Detox device object.
   */
  static getPlatform(): 'android' | 'ios' {
    if (FrameworkDetector.isDetox()) {
      return device.getPlatform() as 'android' | 'ios';
    }

    // For Appium/WebdriverIO, read from cache (no HTTP call)
    return getCachedPlatform();
  }

  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    return PlatformDetector.getPlatform() === 'android';
  }

  /**
   * Check if running on iOS
   */
  static isIOS(): boolean {
    return PlatformDetector.getPlatform() === 'ios';
  }
}
