import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantOptedIn,
  selectPredictThePitchPositionsById,
} from '../../../../reducers/rewards/selectors';
import { setPredictThePitchPositions } from '../../../../reducers/rewards';
import type { PredictThePitchPositionsDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetPredictThePitchPositionsResult {
  positions: PredictThePitchPositionsDto | null;
  isLoading: boolean;
  hasError: boolean;
  hasFetched: boolean;
  refetch: () => Promise<void>;
}

export const useGetPredictThePitchPositions = (
  campaignId: string | undefined,
): UseGetPredictThePitchPositionsResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const positions = useSelector(
    selectPredictThePitchPositionsById(subscriptionId ?? undefined, campaignId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchPositions = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId || !isOptedIn) {
      setIsLoading(false);
      setHasError(false);
      setHasFetched(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPredictThePitchPositions',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setPredictThePitchPositions({
          subscriptionId,
          campaignId,
          positions: result,
        }),
      );
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [dispatch, subscriptionId, campaignId, isOptedIn]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const invalidationEvents = useMemo(
    () => ['RewardsController:leaderboardPositionInvalidated'] as const,
    [],
  );
  useInvalidateByRewardEvents(invalidationEvents, fetchPositions);

  return {
    positions,
    isLoading,
    hasError,
    hasFetched,
    refetch: fetchPositions,
  };
};

export default useGetPredictThePitchPositions;
