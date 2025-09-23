import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setActiveBoosts,
  setActiveBoostsError,
  setActiveBoostsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { PointsBoostDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

/**
 * Custom hook to fetch and manage active points boosts data from the rewards API
 * Uses the RewardsController with built-in caching that persists across component unmounts
 */
export const useActivePointsBoosts = (): void => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);
  const isLoadingRef = useRef(false);

  const fetchActivePointsBoosts = useCallback(async (): Promise<void> => {
    // Don't fetch if required parameters are missing
    if (!seasonId || !subscriptionId) {
      Logger.log('useActivePointsBoosts: Missing seasonId or subscriptionId', {
        seasonId,
        subscriptionId,
      });
      dispatch(setActiveBoostsLoading(false));
      dispatch(setActiveBoostsError(false));
      return;
    }

    // Skip fetch if already loading (prevents duplicate requests)
    if (isLoadingRef.current) {
      Logger.log('useActivePointsBoosts: Fetch already in progress, skipping');
      return;
    }

    try {
      isLoadingRef.current = true;
      dispatch(setActiveBoostsLoading(true));

      // RewardsController now handles caching internally
      const fetchedBoosts: PointsBoostDto[] =
        await Engine.controllerMessenger.call(
          'RewardsController:getActivePointsBoosts',
          seasonId,
          subscriptionId,
        );

      dispatch(setActiveBoosts(fetchedBoosts || []));
      dispatch(setActiveBoostsError(false));
    } catch (fetchError) {
      Logger.log(
        'useActivePointsBoosts: Failed to fetch active points boosts:',
        fetchError instanceof Error ? fetchError.message : 'Unknown error',
      );
      // Keep existing data on error to prevent UI flash
      // Don't dispatch setActiveBoosts([]) here
      dispatch(setActiveBoostsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setActiveBoostsLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId]);

  // Initial fetch and refetch when dependencies change
  useEffect(() => {
    fetchActivePointsBoosts();
  }, [fetchActivePointsBoosts]);

  // Listen for events that should trigger a refetch of active boosts
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:rewardClaimed'],
    fetchActivePointsBoosts,
  );
};
