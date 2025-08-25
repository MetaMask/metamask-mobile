import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectRewardsSubscription } from '../../../../selectors/rewardscontroller';
import {
  setSubscription,
  setReferralDetails,
  setSeasonStatus,
  resetRewardsState,
} from '../../../../actions/rewards';
import { useCurrentSeasonStatus } from './useCurrentSeasonStatus';

/**
 * Hook that synchronizes the rewards controller engine state with the UI store state
 * This ensures that UI components always have access to the latest controller data
 * via the rewards reducer state
 */
export const useRewardsSyncWithEngine = () => {
  const dispatch = useDispatch();

  // Get subscription from engine state
  const subscription = useSelector(selectRewardsSubscription);

  // Get current season status using existing hook
  const {
    seasonStatus,
    isAuthenticated,
    isLoading: isSeasonLoading,
    error: seasonError,
    refresh: refreshSeason,
  } = useCurrentSeasonStatus();

  // Sync subscription data with UI store
  useEffect(() => {
    if (subscription) {
      dispatch(setSubscription(subscription));
    } else {
      // Clear subscription when not available
      dispatch(resetRewardsState());
    }
  }, [subscription, dispatch]);

  // Sync season status with UI store
  useEffect(() => {
    if (seasonStatus) {
      dispatch(setSeasonStatus(seasonStatus));

      // Update referee count if available (you might need to get this from a different endpoint)
      // For now, we'll set it to 0 as a placeholder
      dispatch(
        setReferralDetails({
          refereeCount: 0, // TODO: Get actual referee count from API
        }),
      );
    } else if (!isSeasonLoading && !seasonError) {
      // Clear season status when not available and not loading/erroring
      dispatch(setSeasonStatus(null));
    }
  }, [seasonStatus, isSeasonLoading, seasonError, dispatch]);

  // Reset state when user is not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(resetRewardsState());
    }
  }, [isAuthenticated, dispatch]);

  return {
    isAuthenticated,
    isSeasonLoading,
    seasonError,
    refreshSeason,
    subscription,
    seasonStatus,
  };
};
