import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setActiveBoosts,
  setActiveBoostsError,
  setActiveBoostsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import { type PointsBoostDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useFocusEffect } from '@react-navigation/native';

interface UseActivePointsBoostsReturn {
  fetchActivePointsBoosts: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage active points boosts data from the rewards API
 * Uses the RewardsController with built-in caching that persists across component unmounts
 */
export const useActivePointsBoosts = (): UseActivePointsBoostsReturn => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);
  const isLoadingRef = useRef(false);

  const fetchActivePointsBoosts = useCallback(async (): Promise<void> => {
    // Don't fetch if required parameters are missing
    if (!seasonId || !subscriptionId) {
      dispatch(setActiveBoostsLoading(false));
      dispatch(setActiveBoostsError(false));
      dispatch(setActiveBoosts(null));
      return;
    }

    // Skip fetch if already loading (prevents duplicate requests)
    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setActiveBoostsLoading(true));
      dispatch(setActiveBoostsError(false));

      // RewardsController now handles caching internally
      const fetchedBoosts: PointsBoostDto[] =
        await Engine.controllerMessenger.call(
          'RewardsController:getActivePointsBoosts',
          seasonId,
          subscriptionId,
        );

      dispatch(setActiveBoosts(fetchedBoosts || []));
    } catch (fetchError) {
      // Keep existing data on error to prevent UI flash
      // Don't dispatch setActiveBoosts([]) here
      dispatch(setActiveBoostsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setActiveBoostsLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId]);

  // Initial fetch and refetch when dependencies change
  useFocusEffect(
    useCallback(() => {
      fetchActivePointsBoosts();
    }, [fetchActivePointsBoosts]),
  );

  // Listen for events that should trigger a refetch of active boosts
  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
      'RewardsController:balanceUpdated',
    ],
    fetchActivePointsBoosts,
  );

  return {
    fetchActivePointsBoosts,
  };
};
