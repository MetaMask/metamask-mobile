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
const DEBOUNCE_INTERVAL_MS = 60000;

/**
 * Hook to access Predict eligibility state and trigger refreshes via the controller.
 * Automatically refreshes eligibility when the app comes to foreground.
 */
export const usePredictEligibility = ({
  providerId,
}: {
  providerId: string;
}) => {
  const eligibility = useSelector(selectPredictEligibility);
  const lastRefreshTimeRef = useRef<number>(0);

  // Manual refresh - bypasses debounce and updates timestamp
  const refreshEligibility = useCallback(async () => {
    const controller = Engine.context.PredictController;
    await controller.refreshEligibility();
    lastRefreshTimeRef.current = Date.now();
  }, []);

  // Auto-refresh with debouncing - used by AppState listener
  const autoRefreshEligibility = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

    // Skip if within debounce interval
    if (timeSinceLastRefresh < DEBOUNCE_INTERVAL_MS) {
      DevLogger.log('PredictController: Skipping refresh due to debounce', {
        providerId,
        timeSinceLastRefresh,
        minimumInterval: DEBOUNCE_INTERVAL_MS,
      });
      return;
    }

    try {
      DevLogger.log('PredictController: Auto-refreshing eligibility', {
        providerId,
      });
      await refreshEligibility();
    } catch (error) {
      DevLogger.log('PredictController: Auto-refresh failed', {
        providerId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }, [providerId, refreshEligibility]);

  // Set up AppState listener to refresh eligibility when app comes to foreground
  useEffect(() => {
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
            providerId,
            previousState: previousAppState,
          },
        );
        autoRefreshEligibility();
      }
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
    };
  }, [providerId, autoRefreshEligibility]);

  return {
    isEligible: eligibility[providerId]?.eligible ?? false,
    country: eligibility[providerId]?.country,
    refreshEligibility,
  };
};
