import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import { Platform } from 'react-native';
import Logger from '../../util/Logger';

/**
 * ScreenOrientationService provides centralized control over screen orientation.
 *
 * Phones are locked to portrait. iPad follows the device orientation so the app
 * fills the screen in landscape. Specific screens can still opt in to landscape
 * on phones.
 *
 * @example
 * // Apply the device default on startup
 * await ScreenOrientationService.lockToDefault();
 *
 * // Allow landscape for a specific phone screen
 * await ScreenOrientationService.allowLandscape();
 *
 * // Restore the device default when leaving the screen
 * await ScreenOrientationService.lockToDefault();
 */
export class ScreenOrientationService {
  private static isLocked = false;

  /**
   * Applies the default orientation for the current device.
   * Phones stay portrait. iPad rotates with the device so landscape uses the full screen.
   */
  static async lockToDefault(): Promise<void> {
    if (Platform.OS === 'ios' && Platform.isPad) {
      // Unlocking falls back to UISupportedInterfaceOrientations~ipad in Info.plist.
      await this.allowLandscape();
      return;
    }

    await this.lockToPortrait();
  }

  /**
   * Locks the screen orientation to portrait mode.
   * This should be called on app startup and when leaving screens that allow landscape.
   */
  static async lockToPortrait(): Promise<void> {
    try {
      await lockAsync(OrientationLock.PORTRAIT_UP);
      this.isLocked = true;
    } catch (error) {
      // Silent error handling - orientation lock failures are non-critical
      Logger.log('ScreenOrientationService: Failed to lock to portrait', error);
    }
  }

  /**
   * Unlocks the screen orientation to allow landscape mode.
   * The device orientation will follow the physical device position.
   */
  static async allowLandscape(): Promise<void> {
    try {
      await unlockAsync();
      this.isLocked = false;
    } catch (error) {
      // Silent error handling - orientation unlock failures are non-critical
      Logger.log('ScreenOrientationService: Failed to allow landscape', error);
    }
  }

  /**
   * Returns whether the orientation is currently locked to portrait.
   */
  static isLockedToPortrait(): boolean {
    return this.isLocked;
  }
}

export default ScreenOrientationService;
