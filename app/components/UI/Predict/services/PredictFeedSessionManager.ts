import { AppState, AppStateStatus } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PredictEventValues } from '../constants/eventNames';

/**
 * Singleton manager for Predict Feed session tracking
 * Handles session lifecycle, timing, and analytics events
 *
 * Session boundaries:
 * - Start: User enters Predict Feed
 * - End: App backgrounds OR user navigates away from feed
 *
 * Each session gets unique ID and tracks:
 * - Time spent in feed (with AppState pause/resume)
 * - Pages viewed (tab changes + market detail views)
 * - Current active tab
 * - Entry point (how user entered feed)
 */
class PredictFeedSessionManager {
  private static instance: PredictFeedSessionManager | null = null;

  // Session state
  private sessionId: string | null = null;
  private sessionEnded: boolean = false;
  private entryPoint: string | undefined = undefined;

  // Timing (with AppState handling)
  private startTime: number | null = null;
  private accumulatedTime: number = 0;
  private lastActiveTime: number | null = null;

  // Tracking
  private currentTab: string = 'trending';
  private pageViewCount: number = 0;

  // AppState subscription (only active when PredictFeed is mounted)
  private appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private appStateListenerEnabled: boolean = false;

  private constructor() {
    // Don't setup listener in constructor - let PredictFeed enable it when mounted
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PredictFeedSessionManager {
    if (!PredictFeedSessionManager.instance) {
      PredictFeedSessionManager.instance = new PredictFeedSessionManager();
    }
    return PredictFeedSessionManager.instance;
  }

  /**
   * Setup AppState listener to handle app backgrounding
   * Only called when PredictFeed is mounted
   */
  private setupAppStateListener(): void {
    if (this.appStateSubscription) {
      return; // Already set up
    }

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange.bind(this),
    );

    DevLogger.log('PredictFeedSessionManager: AppState listener enabled');
  }

  /**
   * Remove AppState listener
   * Only called when PredictFeed is unmounted
   */
  private removeAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;

      DevLogger.log('PredictFeedSessionManager: AppState listener disabled');
    }
  }

  /**
   * Handle app state changes
   * Only fires when PredictFeed is mounted (listener is enabled)
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'active') {
      // If session ended (from backgrounding), start a new one with 'background' entry point
      if (this.sessionEnded) {
        DevLogger.log(
          'PredictFeedSessionManager: App returned from background, starting new session',
        );
        this.startSession(
          PredictEventValues.ENTRY_POINT.BACKGROUND,
          this.currentTab,
        );
      } else {
        // Otherwise just resume the timer
        this.resumeSession();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App backgrounding = session ends
      this.endSession();
    }
  }

  /**
   * Pause session timer (accumulate elapsed time)
   */
  private pauseSession(): void {
    if (this.lastActiveTime) {
      const now = Date.now();
      const elapsed = (now - this.lastActiveTime) / 1000;
      this.accumulatedTime += elapsed;
      this.lastActiveTime = null;

      DevLogger.log('PredictFeedSessionManager: Session paused', {
        accumulatedTime: this.accumulatedTime,
        sessionId: this.sessionId,
      });
    }
  }

  /**
   * Resume session timer (if session is active)
   */
  private resumeSession(): void {
    if (this.sessionId && !this.sessionEnded) {
      this.lastActiveTime = Date.now();

      DevLogger.log('PredictFeedSessionManager: Session resumed', {
        sessionId: this.sessionId,
      });
    }
  }

  /**
   * Get total elapsed session time in seconds
   */
  private getElapsedTime(): number {
    let totalTime = this.accumulatedTime;

    if (this.lastActiveTime) {
      const now = Date.now();
      const currentElapsed = (now - this.lastActiveTime) / 1000;
      totalTime += currentElapsed;
    }

    return Math.round(totalTime);
  }

  /**
   * Reset all session state
   */
  private reset(): void {
    this.sessionId = null;
    this.sessionEnded = false;
    this.entryPoint = undefined;
    this.startTime = null;
    this.accumulatedTime = 0;
    this.lastActiveTime = null;
    this.currentTab = 'trending';
    this.pageViewCount = 0;
  }

  /**
   * Track feed viewed event
   */
  private trackEvent(isSessionEnd: boolean = false): void {
    if (!this.sessionId) return;

    Engine.context.PredictController.trackFeedViewed({
      sessionId: this.sessionId,
      feedTab: this.currentTab,
      numPagesViewed: this.pageViewCount,
      sessionTime: this.getElapsedTime(),
      entryPoint: this.entryPoint,
      isSessionEnd,
    });
  }

  /**
   * Start a new session
   * @param entryPoint - How the user entered the feed
   * @param initialTab - Initial active tab
   */
  public startSession(
    entryPoint?: string,
    initialTab: string = 'trending',
  ): void {
    // If previous session ended, reset everything for new session
    if (this.sessionEnded) {
      this.reset();
    }

    // If session already active, ignore
    if (this.sessionId) {
      DevLogger.log('PredictFeedSessionManager: Session already active', {
        sessionId: this.sessionId,
      });
      return;
    }

    // Start new session
    const now = Date.now();
    this.sessionId = uuidv4();
    this.entryPoint = entryPoint;
    this.currentTab = initialTab;
    this.startTime = now;
    this.lastActiveTime = now;
    this.accumulatedTime = 0;
    this.pageViewCount = 0;
    this.sessionEnded = false;

    DevLogger.log('PredictFeedSessionManager: Session started', {
      sessionId: this.sessionId,
      entryPoint,
      initialTab,
    });

    // Track initial event
    this.trackEvent(false);
  }

  /**
   * End current session
   * Sends final event with isSessionEnd: true
   */
  public endSession(): void {
    if (!this.sessionId || this.sessionEnded) {
      return;
    }

    // Pause timer to capture final time
    this.pauseSession();

    DevLogger.log('PredictFeedSessionManager: Ending session', {
      sessionId: this.sessionId,
      finalTime: this.getElapsedTime(),
      finalPageCount: this.pageViewCount,
    });

    // Send final event
    this.trackEvent(true);

    // Mark as ended (but keep state for debugging until next startSession)
    this.sessionEnded = true;
  }

  /**
   * Track tab change
   * @param newTab - New active tab
   */
  public trackTabChange(newTab: string): void {
    if (!this.sessionId || this.sessionEnded) {
      return;
    }

    this.currentTab = newTab;
    this.pageViewCount += 1;

    DevLogger.log('PredictFeedSessionManager: Tab changed', {
      sessionId: this.sessionId,
      newTab,
      pageViewCount: this.pageViewCount,
    });

    // Track event on tab change
    this.trackEvent(false);
  }

  /**
   * Track page view (e.g., returning from market details)
   * Note: Session restart after backgrounding is handled by AppState listener
   */
  public trackPageView(): void {
    // If no active session, ignore (shouldn't happen in normal flow)
    if (!this.sessionId || this.sessionEnded) {
      return;
    }

    // Increment page view counter
    this.pageViewCount += 1;

    DevLogger.log('PredictFeedSessionManager: Page viewed', {
      sessionId: this.sessionId,
      pageViewCount: this.pageViewCount,
    });

    // Track event on page view
    this.trackEvent(false);
  }

  /**
   * Enable AppState listener
   * Call this when PredictFeed mounts
   */
  public enableAppStateListener(): void {
    this.appStateListenerEnabled = true;
    this.setupAppStateListener();
  }

  /**
   * Disable AppState listener
   * Call this when PredictFeed unmounts
   */
  public disableAppStateListener(): void {
    this.appStateListenerEnabled = false;
    this.removeAppStateListener();
  }

  /**
   * Cleanup - remove AppState listener and reset state
   * Call this only when completely tearing down (e.g., tests)
   */
  public destroy(): void {
    this.removeAppStateListener();
    this.reset();
  }
}

// Export singleton instance
export default PredictFeedSessionManager;
