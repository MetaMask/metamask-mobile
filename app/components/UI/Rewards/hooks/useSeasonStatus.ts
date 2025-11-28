import { useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setSeasonStatus,
  setSeasonStatusError,
} from '../../../../actions/rewards';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
  setSeasonStatusLoading,
} from '../../../../reducers/rewards';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { handleRewardsErrorMessage } from '../utils';
import { AuthorizationFailedError } from '../../../../core/Engine/controllers/rewards-controller/services/rewards-data-service';
import { SeasonDtoState } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseSeasonStatusReturn {
  fetchSeasonStatus: () => Promise<void>;
}
/**
 * Custom hook to fetch and manage season status data from the rewards API
 * Uses the RewardsController to get data from the rewards data service
 */
export const useSeasonStatus = ({
  onlyForExplicitFetch = false,
}: {
  onlyForExplicitFetch?: boolean;
}): UseSeasonStatusReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const fetchSeasonStatus = useCallback(async (): Promise<void> => {
    // Don't fetch if no subscriptionId
    if (!subscriptionId) {
      dispatch(setSeasonStatus(null));
      dispatch(setSeasonStatusLoading(false));
      return;
    }

    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    dispatch(setSeasonStatusLoading(true));

    try {
      // Check if there is an active season
      const hasActiveSeason = await Engine.controllerMessenger.call(
        'RewardsController:hasActiveSeason',
      );

      let seasonMetadata: SeasonDtoState | null = null;

      if (hasActiveSeason) {
        // Fetch the current season metadata to get the season ID
        seasonMetadata = await Engine.controllerMessenger.call(
          'RewardsController:getSeasonMetadata',
          'current',
        );
      } else {
        // If no active season, try to get previous season metadata
        seasonMetadata = await Engine.controllerMessenger.call(
          'RewardsController:getSeasonMetadata',
          'previous',
        );
      }

      if (!seasonMetadata) {
        throw new Error('No season metadata found');
      }

      // Then fetch the season status using the season ID
      const statusData = await Engine.controllerMessenger.call(
        'RewardsController:getSeasonStatus',
        subscriptionId,
        seasonMetadata.id,
      );

      dispatch(setSeasonStatus(statusData));
      dispatch(setSeasonStatusError(null));
    } catch (error) {
      if (error instanceof AuthorizationFailedError) {
        dispatch(resetRewardsState());
        dispatch(setCandidateSubscriptionId('retry'));
      }
      const errorMessage = handleRewardsErrorMessage(error);
      dispatch(setSeasonStatusError(errorMessage));
    } finally {
      isLoadingRef.current = false;
      dispatch(setSeasonStatusLoading(false));
    }
  }, [dispatch, subscriptionId]);

  // Refresh data when screen comes into focus (each time page is visited)
  useFocusEffect(
    useCallback(() => {
      if (onlyForExplicitFetch) {
        return;
      }
      fetchSeasonStatus();
    }, [fetchSeasonStatus, onlyForExplicitFetch]),
  );

  const invalidateEvents = useMemo(
    () =>
      onlyForExplicitFetch
        ? []
        : [
            'RewardsController:accountLinked' as const,
            'RewardsController:rewardClaimed' as const,
            'RewardsController:balanceUpdated' as const,
          ],
    [onlyForExplicitFetch],
  );

  useInvalidateByRewardEvents(invalidateEvents, fetchSeasonStatus);

  return {
    fetchSeasonStatus,
  };
};
