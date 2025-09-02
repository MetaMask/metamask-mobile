import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSubscriptionId,
  setSeasonStatus,
  resetRewardsState,
} from '../../../../actions/rewards';
import { useSeasonStatus } from './useSeasonStatus';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

/**
 * Hook that synchronizes the rewards controller engine state with the UI store state
 * This ensures that UI components always have access to the latest controller data
 * via the rewards reducer state
 */
export const useRewardsEngineControllerSync = () => {
  const dispatch = useDispatch();

  // Get subscription from engine state
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  // Get current season status using existing hook
  const { seasonStatus, isLoading: isSeasonStatusLoading } = useSeasonStatus({
    subscriptionId: subscriptionId ?? undefined,
    seasonId: 'current',
  });

  // Sync subscription data with UI store
  useEffect(() => {
    if (subscriptionId) {
      dispatch(setSubscriptionId(subscriptionId));
    } else {
      // Clear subscription when not available
      dispatch(resetRewardsState());
    }
  }, [subscriptionId, dispatch]);

  // Sync season status with UI store
  useEffect(() => {
    if (seasonStatus) {
      dispatch(setSeasonStatus(seasonStatus));
    } else {
      // Clear season status when not available
      dispatch(setSeasonStatus(null));
    }
  }, [seasonStatus, dispatch]);

  // Sync season status loading with UI store
  useEffect(() => {
    dispatch(setSeasonStatusLoading(isSeasonStatusLoading));
  }, [isSeasonStatusLoading, dispatch]);

  return {
    subscriptionId,
    seasonStatus,
    isLoading: isSeasonStatusLoading,
  };
};
