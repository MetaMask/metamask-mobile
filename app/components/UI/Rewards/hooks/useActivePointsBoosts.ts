import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setActiveBoosts,
  setActiveBoostsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { PointsBoostDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';

/**
 * Custom hook to fetch and manage active points boosts data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useActivePointsBoosts = (): void => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);

  const fetchActivePointsBoosts = useCallback(async (): Promise<void> => {
    // Don't fetch if required parameters are missing
    if (!seasonId || !subscriptionId) {
      Logger.log('useActivePointsBoosts: Missing seasonId or subscriptionId', {
        seasonId,
        subscriptionId,
      });
      dispatch(setActiveBoosts([]));
      dispatch(setActiveBoostsLoading(false));
      return;
    }

    try {
      dispatch(setActiveBoostsLoading(true));

      const activeBoosts: PointsBoostDto[] =
        await Engine.controllerMessenger.call(
          'RewardsController:getActivePointsBoosts',
          seasonId,
          subscriptionId,
        );

      dispatch(setActiveBoosts(activeBoosts || []));

      Logger.log(
        'useActivePointsBoosts: Successfully fetched active points boosts',
        {
          boostCount: activeBoosts?.length || 0,
        },
      );
    } catch (fetchError) {
      Logger.log(
        'useActivePointsBoosts: Failed to fetch active points boosts:',
        fetchError instanceof Error ? fetchError.message : 'Unknown error',
      );
      // Keep existing data on error to prevent UI flash
      // Don't dispatch setActiveBoosts([]) here
    } finally {
      dispatch(setActiveBoostsLoading(false));
    }
  }, [dispatch, seasonId, subscriptionId]);

  useEffect(() => {
    fetchActivePointsBoosts();
  }, [fetchActivePointsBoosts]);
};
