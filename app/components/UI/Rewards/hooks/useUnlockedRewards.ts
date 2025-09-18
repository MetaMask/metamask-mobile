import { useEffect, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { useDispatch, useSelector } from 'react-redux';
import {
  setUnlockedRewards,
  setUnlockedRewardLoading,
} from '../../../../reducers/rewards';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

/**
 * Custom hook to fetch and manage unlocked rewards data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useUnlockedRewards = (): void => {
  const seasonId = useSelector(selectSeasonId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();

  const fetchUnlockedRewards = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId
    if (!subscriptionId || !seasonId) {
      dispatch(setUnlockedRewards([]));
      dispatch(setUnlockedRewardLoading(false));
      return;
    }

    dispatch(setUnlockedRewardLoading(true));

    try {
      const unlockedRewardsData = await Engine.controllerMessenger.call(
        'RewardsController:getUnlockedRewards',
        seasonId,
        subscriptionId,
      );

      dispatch(setUnlockedRewards(unlockedRewardsData));
    } catch (err) {
      // Keep existing data on error to prevent UI flash
      dispatch(setUnlockedRewards([]));
    } finally {
      dispatch(setUnlockedRewardLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId]);

  // Initial data fetch
  useEffect(() => {
    fetchUnlockedRewards();
  }, [fetchUnlockedRewards]);

  // Listen for account linked events to trigger refetch
  useEffect(() => {
    fetchUnlockedRewards();

    Engine.controllerMessenger.subscribe(
      'RewardsController:accountLinked',
      fetchUnlockedRewards,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:accountLinked',
        fetchUnlockedRewards,
      );
    };
  }, [fetchUnlockedRewards]);

  // Listen for reward claimed events to trigger refetch
  useEffect(() => {
    fetchUnlockedRewards();

    Engine.controllerMessenger.subscribe(
      'RewardsController:rewardClaimed',
      fetchUnlockedRewards,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:rewardClaimed',
        fetchUnlockedRewards,
      );
    };
  }, [fetchUnlockedRewards]);
};
