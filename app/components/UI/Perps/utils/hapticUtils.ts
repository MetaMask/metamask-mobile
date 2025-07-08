import { impactAsync, ImpactFeedbackStyle, selectionAsync, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Haptic Feedback Utilities for Perps Trading
 *
 * Provides consistent haptic feedback patterns for leverage and margin interactions
 * as specified in JIRA requirements:
 * - Every % when increasing/decreasing leverage
 * - Every 5% when increasing/decreasing margin
 */

/**
 * Trigger light haptic feedback for frequent interactions (leverage changes)
 * Used for every 1% leverage change
 */
export const triggerLeverageHaptic = async (): Promise<void> => {
  try {
    await impactAsync(ImpactFeedbackStyle.Light);
  } catch (error) {
    // Haptic feedback is not critical - fail silently
    DevLogger.log('Haptic feedback not available:', error);
  }
};

/**
 * Trigger medium haptic feedback for milestone interactions (margin changes)
 * Used for every 5% margin change
 */
export const triggerMarginHaptic = async (): Promise<void> => {
  try {
    await impactAsync(ImpactFeedbackStyle.Medium);
  } catch (error) {
    // Haptic feedback is not critical - fail silently
    DevLogger.log('Haptic feedback not available:', error);
  }
};

/**
 * Trigger subtle haptic feedback for button taps and selections
 */
export const triggerSelectionHaptic = async (): Promise<void> => {
  try {
    await selectionAsync();
  } catch (error) {
    // Haptic feedback is not critical - fail silently
    DevLogger.log('Haptic feedback not available:', error);
  }
};

/**
 * Trigger success haptic feedback for successful actions (order placement, etc.)
 */
export const triggerSuccessHaptic = async (): Promise<void> => {
  try {
    await notificationAsync(NotificationFeedbackType.Success);
  } catch (error) {
    // Haptic feedback is not critical - fail silently
    DevLogger.log('Haptic feedback not available:', error);
  }
};

/**
 * Trigger error haptic feedback for failed actions
 */
export const triggerErrorHaptic = async (): Promise<void> => {
  try {
    await notificationAsync(NotificationFeedbackType.Error);
  } catch (error) {
    // Haptic feedback is not critical - fail silently
    DevLogger.log('Haptic feedback not available:', error);
  }
};

/**
 * Debounced haptic feedback for rapid value changes
 * Prevents excessive haptic feedback during slider interactions
 */
export class DebouncedHaptic {
  private timeoutId: NodeJS.Timeout | null = null;
  private lastValue: number | null = null;
  private readonly threshold: number;
  private readonly hapticFn: () => Promise<void>;

  constructor(threshold: number, hapticFn: () => Promise<void>) {
    this.threshold = threshold;
    this.hapticFn = hapticFn;
  }

  /**
   * Trigger haptic feedback only when value crosses threshold boundaries
   * @param currentValue - Current value (leverage or margin percentage)
   */
  trigger(currentValue: number): void {
    if (this.lastValue === null) {
      this.lastValue = currentValue;
      return;
    }

    // Calculate threshold boundaries crossed
    const lastThreshold = Math.floor(this.lastValue / this.threshold);
    const currentThreshold = Math.floor(currentValue / this.threshold);

    if (lastThreshold !== currentThreshold) {
      // Clear any pending haptic feedback
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      // Trigger haptic feedback immediately
      this.hapticFn();
      this.lastValue = currentValue;
    }
  }

  /**
   * Reset the debouncer state
   */
  reset(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.lastValue = null;
  }
}

/**
 * Create a debounced haptic feedback handler for leverage changes (every 1%)
 */
export const createLeverageHapticHandler = (): DebouncedHaptic => new DebouncedHaptic(1, triggerLeverageHaptic);

/**
 * Create a debounced haptic feedback handler for margin changes (every 5%)
 */
export const createMarginHapticHandler = (): DebouncedHaptic => new DebouncedHaptic(5, triggerMarginHaptic);
