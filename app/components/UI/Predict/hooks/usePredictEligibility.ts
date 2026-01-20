import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

const selectPredictEligibility = createSelector(
  (state: RootState) => state.engine.backgroundState.PredictController,
  (predictState) => predictState.eligibility,
);

export type PredictEligibilityState = ReturnType<
  typeof selectPredictEligibility
>;

// Minimum time between automatic eligibility refreshes (1 minute)
const DEBOUNCE_INTERVAL_MS = 100;

// Polling interval for auto-refresh when country is missing (2 seconds)
const MISSING_COUNTRY_POLLING_INTERVAL_MS = 2000;

// Maximum number of retry attempts when country is missing
const MISSING_COUNTRY_MAX_RETRIES = 3;

/**
 * Singleton manager to coordinate eligibility refreshes across multiple hook instances.
 * This ensures that only one AppState listener is active and only one refresh happens
 * at a time, regardless of how many components use the usePredictEligibility hook.
 */
class EligibilityRefreshManager {
  private static instance: EligibilityRefreshManager | null = null;
  private activeListeners = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  private lastRefreshTime = 0;
  private refreshPromise: Promise<void> | null = null;

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
  async refresh(force = false): Promise<void> {
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
      return;
    }

    this.lastRefreshTime = now;
    const controller = Engine.context.PredictController;

    this.refreshPromise = controller.refreshEligibility().finally(() => {
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

  /**
   * Reset the manager (for testing purposes)
   */
  reset(): void {
    this.cleanupAppStateListener();
    this.activeListeners = 0;
    this.lastRefreshTime = 0;
    this.refreshPromise = null;
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

/**
 * Hook to access Predict eligibility state and trigger refreshes via the controller.
 * Automatically refreshes eligibility when the app comes to foreground.
 * Multiple components can safely use this hook without causing duplicate refreshes.
 *
 * When no country is returned in the eligibility response, the hook will automatically
 * poll for updates using a sequential loading pattern (wait for response → wait interval → poll again)
 * until a country is returned or the component unmounts.
 */
export const usePredictEligibility = ({
  providerId,
}: {
  providerId: string;
}) => {
  const eligibility = useSelector(selectPredictEligibility);
  const country = eligibility[providerId]?.country;

  // Manual refresh - bypasses debounce (force = true)
  const refreshEligibility = useCallback(async () => {
    await refreshManager.refresh(true);
  }, []);

  // Store refreshEligibility in a ref to avoid effect restarts when its identity changes
  const refreshEligibilityRef = useRef(refreshEligibility);
  refreshEligibilityRef.current = refreshEligibility;

  // Register this hook instance with the singleton manager
  useEffect(() => {
    DevLogger.log('PredictController: Mounting eligibility hook', {
      providerId,
    });

    refreshManager.register();

    return () => {
      DevLogger.log('PredictController: Unmounting eligibility hook', {
        providerId,
      });
      refreshManager.unregister();
    };
  }, [providerId]);

  // Auto-refresh when country is missing - sequential loading pattern
  // Similar to usePredictOptimisticPositionRefresh
  // Retries up to MISSING_COUNTRY_MAX_RETRIES times, resets on unmount
  useEffect(() => {
    // Skip if we already have a country
    if (country) return;

    let shouldContinue = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let retryCount = 0;

    const pollForCountry = async () => {
      if (!shouldContinue) return;

      retryCount += 1;

      DevLogger.log(
        'PredictController: Country missing, auto-refreshing eligibility',
        { providerId, retryCount, maxRetries: MISSING_COUNTRY_MAX_RETRIES },
      );

      try {
        await refreshEligibilityRef.current();
      } catch (error) {
        // Continue polling even if an individual request fails
        // This ensures we keep trying to get country data
        DevLogger.log(
          'PredictController: Auto-refresh for missing country failed',
          {
            error: error instanceof Error ? error.message : 'Unknown',
            retryCount,
          },
        );
      }

      // After the response (or error), schedule next poll if still active
      // and we haven't reached max retries
      // Note: The effect will re-run if country becomes available,
      // which will stop the polling due to the early return
      if (shouldContinue && retryCount < MISSING_COUNTRY_MAX_RETRIES) {
        timeoutId = setTimeout(() => {
          pollForCountry();
        }, MISSING_COUNTRY_POLLING_INTERVAL_MS);
      } else if (shouldContinue && retryCount >= MISSING_COUNTRY_MAX_RETRIES) {
        DevLogger.log(
          'PredictController: Max retries reached for missing country',
          { providerId, retryCount },
        );
      }
    };

    pollForCountry();

    return () => {
      // Reset retry count on unmount (retryCount is local to this effect instance)
      shouldContinue = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [country, providerId]);

  return {
    isEligible: eligibility[providerId]?.eligible ?? false,
    country,
    refreshEligibility,
  };
};
