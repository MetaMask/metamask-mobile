import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { RootState } from '../../../../reducers';
import { PredictEligibility } from '../types';

const selectPredictEligibility = createSelector(
  (state: RootState) => state.engine.backgroundState.PredictController,
  (predictState) => predictState.eligibility,
);

export type PredictEligibilityState = ReturnType<
  typeof selectPredictEligibility
>;

const FALLBACK_ELIGIBILITY: PredictEligibility = { status: 'checking' };

// Minimum time between automatic eligibility refreshes (1 minute)
const DEBOUNCE_INTERVAL_MS = 60_000;

// Delay between completed automatic retries when eligibility is unavailable
const AUTO_RETRY_INTERVAL_MS = 2_000;

// Maximum number of automatic retry attempts when eligibility is unavailable
const AUTO_RETRY_MAX_ATTEMPTS = 3;

const isDefinitiveEligibility = (eligibility: PredictEligibility) =>
  eligibility.status === 'eligible' || eligibility.status === 'ineligible';

const currentEligibility = (): PredictEligibility =>
  Engine.context.PredictController.state?.eligibility ?? FALLBACK_ELIGIBILITY;

/**
 * Singleton manager to coordinate eligibility refreshes across multiple hook instances.
 * This ensures that only one AppState listener is active, only one refresh happens
 * at a time, and unavailable-eligibility recovery uses a single retry cycle.
 */
class EligibilityRefreshManager {
  private static instance: EligibilityRefreshManager | null = null;
  private activeListeners = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  private lastRefreshTime = 0;
  private refreshPromise: Promise<PredictEligibility> | null = null;
  private retryAttemptCount = 0;
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private retryInFlight = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): EligibilityRefreshManager {
    if (!EligibilityRefreshManager.instance) {
      EligibilityRefreshManager.instance = new EligibilityRefreshManager();
    }
    return EligibilityRefreshManager.instance;
  }

  /**
   * Register a hook instance
   */
  register(): void {
    this.activeListeners++;

    if (this.activeListeners === 1) {
      DevLogger.log('PredictController: Starting eligibility refresh manager', {
        activeListeners: this.activeListeners,
      });
      this.setupAppStateListener();
      this.startRecoveryIfNeeded();
    } else {
      DevLogger.log('PredictController: Additional listener registered', {
        activeListeners: this.activeListeners,
      });
    }
  }

  /**
   * Unregister a hook instance
   */
  unregister(): void {
    this.activeListeners--;

    if (this.activeListeners === 0) {
      DevLogger.log('PredictController: Stopping eligibility refresh manager');
      this.cleanupAppStateListener();
      this.clearRetryTimer();
      this.retryAttemptCount = 0;
      this.retryInFlight = false;
    } else {
      DevLogger.log('PredictController: Listener unregistered', {
        activeListeners: this.activeListeners,
      });
    }
  }

  /**
   * Refresh eligibility with debouncing and race condition prevention
   * @param force - If true, bypasses debouncing
   */
  async refresh(force = false): Promise<PredictEligibility> {
    // If a refresh is already in progress, reuse that promise
    if (this.refreshPromise) {
      DevLogger.log(
        'PredictController: Refresh already in progress, reusing promise',
      );
      return this.refreshPromise;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;

    // Check if we're within the debounce interval (unless forced)
    if (!force && timeSinceLastRefresh < DEBOUNCE_INTERVAL_MS) {
      DevLogger.log('PredictController: Skipping refresh due to debounce', {
        timeSinceLastRefresh,
        minimumInterval: DEBOUNCE_INTERVAL_MS,
      });
      return currentEligibility();
    }

    this.lastRefreshTime = now;
    const controller = Engine.context.PredictController;

    this.refreshPromise = controller
      .refreshEligibility()
      .then((result) => {
        this.handleCompletedRefresh(result);
        return result;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Set up AppState listener
   */
  private setupAppStateListener(): void {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only refresh when transitioning from background/inactive to active
      if (
        previousAppState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        DevLogger.log(
          'PredictController: App became active, refreshing eligibility',
          {
            previousState: previousAppState,
          },
        );
        this.refresh().catch((error) => {
          DevLogger.log('PredictController: Auto-refresh failed', {
            error: error instanceof Error ? error.message : 'Unknown',
          });
        });
      }
      previousAppState = nextAppState;
    };

    this.appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
  }

  /**
   * Clean up AppState listener
   */
  private cleanupAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  private startRecoveryIfNeeded(): void {
    const eligibility = currentEligibility();
    if (isDefinitiveEligibility(eligibility)) {
      return;
    }

    if (eligibility.status === 'checking') {
      this.refresh(true).catch((error) => {
        DevLogger.log('PredictController: Initial eligibility refresh failed', {
          error: error instanceof Error ? error.message : 'Unknown',
        });
        if (this.activeListeners > 0) {
          this.scheduleAutoRetry(AUTO_RETRY_INTERVAL_MS);
        }
      });
      return;
    }

    this.scheduleAutoRetry(0);
  }

  private handleCompletedRefresh(result: PredictEligibility): void {
    if (!result) {
      return;
    }

    if (isDefinitiveEligibility(result)) {
      this.retryAttemptCount = 0;
      this.clearRetryTimer();
      return;
    }

    if (this.retryInFlight) {
      return;
    }

    this.scheduleAutoRetry(AUTO_RETRY_INTERVAL_MS);
  }

  private scheduleAutoRetry(delayMs: number): void {
    if (this.retryAttemptCount >= AUTO_RETRY_MAX_ATTEMPTS) {
      return;
    }

    if (this.retryTimeoutId || this.retryInFlight) {
      return;
    }

    this.retryTimeoutId = setTimeout(() => {
      this.retryTimeoutId = null;
      this.runAutoRetry();
    }, delayMs);
  }

  private runAutoRetry(): void {
    if (this.activeListeners === 0) {
      return;
    }

    if (this.retryAttemptCount >= AUTO_RETRY_MAX_ATTEMPTS) {
      return;
    }

    this.retryInFlight = true;
    this.retryAttemptCount += 1;

    DevLogger.log(
      'PredictController: Eligibility unavailable, auto-refreshing',
      {
        retryCount: this.retryAttemptCount,
        maxRetries: AUTO_RETRY_MAX_ATTEMPTS,
      },
    );

    this.refresh(true)
      .then((result) => {
        this.retryInFlight = false;

        if (this.activeListeners === 0) {
          return;
        }

        if (isDefinitiveEligibility(result)) {
          this.retryAttemptCount = 0;
          return;
        }

        if (this.retryAttemptCount >= AUTO_RETRY_MAX_ATTEMPTS) {
          DevLogger.log(
            'PredictController: Max retries reached for unavailable eligibility',
            { retryCount: this.retryAttemptCount },
          );
          return;
        }

        this.scheduleAutoRetry(AUTO_RETRY_INTERVAL_MS);
      })
      .catch((error) => {
        this.retryInFlight = false;

        DevLogger.log(
          'PredictController: Auto-refresh for unavailable eligibility failed',
          {
            error: error instanceof Error ? error.message : 'Unknown',
            retryCount: this.retryAttemptCount,
          },
        );

        if (
          this.activeListeners > 0 &&
          this.retryAttemptCount < AUTO_RETRY_MAX_ATTEMPTS
        ) {
          this.scheduleAutoRetry(AUTO_RETRY_INTERVAL_MS);
        }
      });
  }

  /**
   * Reset the manager (for testing purposes)
   */
  reset(): void {
    this.cleanupAppStateListener();
    this.clearRetryTimer();
    this.activeListeners = 0;
    this.lastRefreshTime = 0;
    this.refreshPromise = null;
    this.retryAttemptCount = 0;
    this.retryInFlight = false;
  }

  /**
   * Get instance for testing
   */
  static getInstanceForTesting(): EligibilityRefreshManager | null {
    return EligibilityRefreshManager.instance;
  }
}

// Singleton instance shared across all hook usages
const refreshManager = EligibilityRefreshManager.getInstance();

// Export for testing purposes
export const getRefreshManagerForTesting = (): EligibilityRefreshManager =>
  refreshManager;

interface UsePredictEligibilityReturn {
  status: PredictEligibility['status'];
  isEligible: boolean;
  isIneligible: boolean;
  isChecking: boolean;
  isUnavailable: boolean;
  country: string | undefined;
  refreshEligibility: () => Promise<PredictEligibility>;
}

/**
 * Hook to access Predict eligibility state and trigger refreshes via the controller.
 * Automatically refreshes eligibility when the app comes to foreground.
 * Multiple components can safely use this hook without causing duplicate refreshes.
 *
 * When eligibility is `unavailable`, a single global retry cycle (max 3 attempts,
 * 2s between completed attempts) continues until a definitive result arrives or
 * the last listener unmounts. Explicit user retries remain available after the
 * automatic budget is exhausted.
 */
export const usePredictEligibility = (): UsePredictEligibilityReturn => {
  const eligibility =
    useSelector(selectPredictEligibility) ?? FALLBACK_ELIGIBILITY;
  const status = eligibility.status ?? 'checking';

  const refreshEligibility = useCallback(
    async () => refreshManager.refresh(true),
    [],
  );

  useEffect(() => {
    DevLogger.log('PredictController: Mounting eligibility hook');

    refreshManager.register();

    return () => {
      DevLogger.log('PredictController: Unmounting eligibility hook');
      refreshManager.unregister();
    };
  }, []);

  return {
    status,
    isEligible: status === 'eligible',
    isIneligible: status === 'ineligible',
    isChecking: status === 'checking',
    isUnavailable: status === 'unavailable',
    country:
      status === 'eligible' || status === 'ineligible'
        ? eligibility.country
        : undefined,
    refreshEligibility,
  };
};
