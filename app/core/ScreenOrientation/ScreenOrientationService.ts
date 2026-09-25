import { Dimensions } from 'react-native';
import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import Logger from '../../util/Logger';
import { isExpandedDisplay } from './expandedDisplay';

/**
 * ScreenOrientationService provides centralized control over screen orientation.
 *
 * By default, the app is locked to portrait mode. Specific screens can opt-in
 * to allow landscape orientation using the provided methods.
 *
 * The unfolded iPhone Duo canvas is the exception: rotation follows the device
 * there, and the portrait lock applies again when the window returns to a
 * phone-sized cover screen.
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
  private static portraitLockRequested = true;
  private static lastExpanded: boolean | null = null;
  private static isListening = false;

  /**
   * Locks the screen orientation to portrait mode.
   * This should be called on app startup and when leaving screens that allow landscape.
   * On the unfolded iPhone Duo canvas this keeps rotation enabled instead.
   */
  static async lockToPortrait(): Promise<void> {
    this.portraitLockRequested = true;
    await this.applyOrientation();
  }

  /**
   * Unlocks the screen orientation to allow landscape mode.
   * The device orientation will follow the physical device position.
   */
  static async allowLandscape(): Promise<void> {
    this.portraitLockRequested = false;
    await this.applyOrientation();
  }

  private static ensureDisplayListener(): void {
    if (this.isListening) {
      return;
    }
    this.isListening = true;

    Dimensions.addEventListener('change', () => {
      const expanded = isExpandedDisplay();
      if (expanded === this.lastExpanded) {
        return;
      }
      void this.applyOrientation();
    });
  }

  private static async applyOrientation(): Promise<void> {
    this.ensureDisplayListener();
    const expanded = isExpandedDisplay();
    this.lastExpanded = expanded;
    const lockPortrait = this.portraitLockRequested && !expanded;

    try {
      if (lockPortrait) {
        await lockAsync(OrientationLock.PORTRAIT_UP);
        this.isLocked = true;
        return;
      }

      await unlockAsync();
      this.isLocked = false;
    } catch (error) {
      Logger.log(
        'ScreenOrientationService: Failed to update orientation',
        error,
      );
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
