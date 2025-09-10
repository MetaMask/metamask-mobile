import { useEffect, useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { setSeasonStatus } from '../../../../actions/rewards';
import { useDispatch } from 'react-redux';
import { setSeasonStatusLoading } from '../../../../reducers/rewards';

export interface UseSeasonStatusOptions {
  /**
   * Season ID to fetch status for
   * If not provided, will not fetch data
   */
  seasonId?: string;

  /**
   * Subscription ID for authentication
   * If not provided, will not fetch data
   */
  subscriptionId?: string;
}

/**
 * Custom hook to fetch and manage season status data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useSeasonStatus = (options: UseSeasonStatusOptions = {}): null => {
  const { seasonId, subscriptionId } = options;
  const dispatch = useDispatch();

  const fetchSeasonStatus = useCallback(async (): Promise<void> => {
    // Don't fetch if required parameters are missing
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
        seasonId || 'current',
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

  return null;
};
