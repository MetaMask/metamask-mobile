import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import Logger from '../../util/Logger';

/**
 * ScreenOrientationService provides centralized control over screen orientation.
 *
 * By default, the app is locked to portrait mode. Specific screens can opt-in
 * to allow landscape orientation using the provided methods.
 *
 * @example
 * // Lock app to portrait on startup
 * await ScreenOrientationService.lockToPortrait();
 *
 * // Allow landscape for a specific screen
 * await ScreenOrientationService.allowLandscape();
 *
 * // Lock back to portrait when leaving the screen
 * await ScreenOrientationService.lockToPortrait();
 */
export class ScreenOrientationService {
  private static isLocked = false;

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
