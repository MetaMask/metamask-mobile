/**
 * AppStateAPI - App state monitoring and lock timer management
 *
 * This API monitors app state changes (background/foreground/inactive) and
 * provides lock timer functionality. It does NOT perform locking - it only
 * emits events that the state machine listens to.
 *
 * Key principle: Separation of concerns
 * - This API: Monitors and emits events
 * - State machine: Handles the actual locking
 */

import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import Logger from '../../util/Logger';
import EventEmitter from 'eventemitter2';

/**
 * AppStateService monitors app state and emits events.
 * Uses EventEmitter pattern for clean separation of concerns.
 */
class AppStateServiceImplementation extends EventEmitter {
  private static instance: AppStateServiceImplementation;

  // Current app state
  private currentAppState: AppStateStatus = AppState.currentState;

  // Native listener
  private appStateListener?: NativeEventSubscription;

  // Lock timer (timing only, not locking)
  private lockTimer?: number;
  private lockTimerStartTime?: number;
  private lockTimerDuration?: number;
  private lockCallback?: () => void;

  // Initialization state
  private initialized: boolean = false;

  private constructor() {
    super();
    this.currentAppState = AppState.currentState;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AppStateServiceImplementation {
    if (!AppStateServiceImplementation.instance) {
      AppStateServiceImplementation.instance =
        new AppStateServiceImplementation();
    }
    return AppStateServiceImplementation.instance;
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Initialize the AppStateAPI
   * Sets up native app state listener
   */
  initialize(): void {
    if (this.initialized) {
      Logger.log('AppStateAPI: Already initialized');
      return;
    }

    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    this.initialized = true;
    Logger.log('AppStateAPI: Initialized');
  }

  /**
   * Cleanup the AppStateAPI
   * Removes listeners and clears timers
   */
  cleanup(): void {
    if (!this.initialized) {
      return;
    }

    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = undefined;
    }

    this.clearLockTimer();
    this.removeAllListeners();

    this.initialized = false;
    Logger.log('AppStateAPI: Cleaned up');
  }

  // ==========================================================================
  // App State Monitoring
  // ==========================================================================

  /**
   * Handle app state changes from React Native
   * Emits specific events based on state transitions
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const previousState = this.currentAppState;

    try {
      // Update current state
      this.currentAppState = nextAppState;

      // Emit specific event based on state
      if (nextAppState === 'active' && previousState !== 'active') {
        this.emit('foreground', nextAppState);
        Logger.log('AppStateAPI: App foregrounded');
      } else if (
        nextAppState === 'background' &&
        previousState !== 'background'
      ) {
        this.emit('background', nextAppState);
        Logger.log('AppStateAPI: App backgrounded');
      } else if (nextAppState === 'inactive') {
        this.emit('inactive', nextAppState);
        Logger.log('AppStateAPI: App inactive');
      }

      // Always emit generic change event
      this.emit('change', nextAppState);
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateAPI: Error handling app state change',
      );
    }
  };

  /**
   * Get the current app state
   */
  getCurrentAppState(): AppStateStatus {
    return this.currentAppState;
  }

  // ==========================================================================
  // Lock Timer Management (Timing only, not locking!)
  // ==========================================================================

  /**
   * Start a lock timer that will call callback after duration
   *
   * Note: This only manages timing. The callback should dispatch an action
   * that the state machine handles. This API does NOT lock anything.
   *
   * @param duration - Time in milliseconds until callback
   * @param callback - Function to call when timer expires
   */
  startLockTimer(duration: number, callback: () => void): void {
    // Clear any existing timer first
    this.clearLockTimer();

    this.lockCallback = callback;
    this.lockTimerDuration = duration;
    this.lockTimerStartTime = Date.now();

    this.lockTimer = BackgroundTimer.setTimeout(() => {
      Logger.log('AppStateAPI: Lock timer expired');
      if (this.lockCallback) {
        this.lockCallback();
      }
      this.clearLockTimer();
    }, duration);

    Logger.log(`AppStateAPI: Lock timer started for ${duration}ms`);
  }

  /**
   * Clear the active lock timer
   */
  clearLockTimer(): void {
    if (!this.lockTimer) {
      return;
    }

    BackgroundTimer.clearTimeout(this.lockTimer);
    this.lockTimer = undefined;
    this.lockTimerStartTime = undefined;
    this.lockTimerDuration = undefined;
    this.lockCallback = undefined;

    Logger.log('AppStateAPI: Lock timer cleared');
  }

  /**
   * Get remaining time on lock timer
   *
   * @returns Milliseconds remaining, or null if no timer active
   */
  getLockTimerRemaining(): number | null {
    if (
      !this.lockTimer ||
      !this.lockTimerStartTime ||
      !this.lockTimerDuration
    ) {
      return null;
    }

    const elapsed = Date.now() - this.lockTimerStartTime;
    const remaining = Math.max(0, this.lockTimerDuration - elapsed);

    return remaining;
  }

  /**
   * Check if lock timer is currently active
   */
  isLockTimerActive(): boolean {
    return !!this.lockTimer;
  }

  // ==========================================================================
  // State Queries
  // ==========================================================================

  /**
   * Check if app is in foreground (active)
   */
  isAppInForeground(): boolean {
    return this.currentAppState === 'active';
  }

  /**
   * Check if app is in background
   */
  isAppInBackground(): boolean {
    return this.currentAppState === 'background';
  }

  /**
   * Check if app is inactive (transitioning)
   */
  isAppInactive(): boolean {
    return this.currentAppState === 'inactive';
  }

  /**
   * Check if API is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const AppStateService = AppStateServiceImplementation.getInstance();

// Export class for testing
export { AppStateServiceImplementation };

// Export types
export type { AppStateStatus };
