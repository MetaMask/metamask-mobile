import {
  getPlatform as getCachedPlatform,
  getPlatformVersion as getCachedPlatformVersion,
} from './DeviceInfoCache.ts';

/**
 * Platform detector for Appium sessions.
 * Uses cached device info to avoid repeated HTTP calls to the Appium server.
 */
export class PlatformDetector {
  /**
   * Get current platform (android/ios) from cached device info.
   */
  static getPlatform(): 'android' | 'ios' {
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

  static isIOSAtLeast(majorVersion: number): boolean {
    if (!PlatformDetector.isIOS()) {
      return false;
    }
    const major = Number.parseInt(getCachedPlatformVersion(), 10);
    return Number.isFinite(major) && major >= majorVersion;
  }

  /** Appium session on Android. */
  static isAndroidAppium(): boolean {
    return PlatformDetector.isAndroid();
  }

  /** Appium session on iOS. */
  static isIOSAppium(): boolean {
    return PlatformDetector.isIOS();
  }
}
