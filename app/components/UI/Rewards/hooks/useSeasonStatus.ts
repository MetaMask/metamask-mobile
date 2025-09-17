import { useEffect, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { setSeasonStatus } from '../../../../actions/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';
import { CURRENT_SEASON_ID } from '../../../../core/Engine/controllers/rewards-controller/types';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

/**
 * Custom hook to fetch and manage season status data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useSeasonStatus = (): void => {
  const seasonId = useSelector(selectSeasonId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();

  const fetchSeasonStatus = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId
    if (!subscriptionId) {
      dispatch(setSeasonStatus(null));
      dispatch(setSeasonStatusLoading(false));
      return;
    }

    dispatch(setSeasonStatusLoading(true));

    try {
      const statusData = await Engine.controllerMessenger.call(
        'RewardsController:getSeasonStatus',
        subscriptionId,
        seasonId || CURRENT_SEASON_ID,
      );

      dispatch(setSeasonStatus(statusData));
    } catch (err) {
      // Keep existing data on error to prevent UI flash
      dispatch(setSeasonStatus(null));
    } finally {
      dispatch(setSeasonStatusLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId]);

  // Initial data fetch
  useEffect(() => {
    fetchSeasonStatus();
  }, [fetchSeasonStatus]);

  // Listen for account linked events to trigger refetch
  useEffect(() => {
    const handleAccountLinked = () => {
      fetchSeasonStatus();
    };

    Engine.controllerMessenger.subscribe(
      'RewardsController:accountLinked',
      handleAccountLinked,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:accountLinked',
        handleAccountLinked,
      );
    };
  }, [fetchSeasonStatus]);

  // Listen for reward claimed events to trigger refetch
  useEffect(() => {
    const handleRewardClaimed = () => {
      fetchSeasonStatus();
    };

    Engine.controllerMessenger.subscribe(
      'RewardsController:rewardClaimed',
      handleRewardClaimed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:rewardClaimed',
        handleRewardClaimed,
      );
    };
  }, [fetchSeasonStatus]);
};
