import { useCallback, useRef } from 'react';
import Engine from '../../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  setUnlockedRewards,
  setUnlockedRewardLoading,
  setUnlockedRewardError,
} from '../../../../reducers/rewards';
import {
  selectCurrentTier,
  selectSeasonId,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { useFocusEffect } from '@react-navigation/native';

interface UseUnlockedRewardsReturn {
  fetchUnlockedRewards: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage unlocked rewards data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useUnlockedRewards = (): UseUnlockedRewardsReturn => {
  const seasonId = useSelector(selectSeasonId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const currentTier = useSelector(selectCurrentTier);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const fetchUnlockedRewards = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId or if current tier is base tier.
    if (!subscriptionId || !seasonId || !currentTier?.pointsNeeded) {
      dispatch(setUnlockedRewards(null));
      dispatch(setUnlockedRewardLoading(false));
      dispatch(setUnlockedRewardError(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;

      dispatch(setUnlockedRewardLoading(true));
      dispatch(setUnlockedRewardError(false));

      const unlockedRewardsData = await Engine.controllerMessenger.call(
        'RewardsController:getUnlockedRewards',
        seasonId,
        subscriptionId,
      );

      dispatch(setUnlockedRewards(unlockedRewardsData));
    } catch {
      // Keep existing data on error to prevent UI flash
      dispatch(setUnlockedRewardError(true));
      console.error('Error fetching unlocked rewards');
    } finally {
      isLoadingRef.current = false;
      dispatch(setUnlockedRewardLoading(false));
    }
  }, [currentTier?.pointsNeeded, dispatch, seasonId, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchUnlockedRewards();
    }, [fetchUnlockedRewards]),
  );

  // Listen for account linked events to trigger refetch
  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
      'RewardsController:balanceUpdated',
    ],
    fetchUnlockedRewards,
  );

  return {
    fetchUnlockedRewards,
  };
};
