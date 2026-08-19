import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantOptedIn,
  selectPredictThePitchLeaderboardPositionById,
} from '../../../../reducers/rewards/selectors';
import { setPredictThePitchLeaderboardPosition } from '../../../../reducers/rewards';
import type { PredictThePitchLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetPredictThePitchLeaderboardPositionResult {
  position: PredictThePitchLeaderboardPositionDto | null;
  isLoading: boolean;
  hasError: boolean;
  hasFetched: boolean;
  refetch: () => Promise<void>;
}

export const useGetPredictThePitchLeaderboardPosition = (
  campaignId: string | undefined,
): UseGetPredictThePitchLeaderboardPositionResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const position = useSelector(
    selectPredictThePitchLeaderboardPositionById(
      subscriptionId ?? undefined,
      campaignId,
    ),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchPosition = useCallback(async (): Promise<void> => {
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
        'RewardsController:getPredictThePitchLeaderboardPosition',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setPredictThePitchLeaderboardPosition({
          subscriptionId,
          campaignId,
          position: result,
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
    fetchPosition();
  }, [fetchPosition]);

  const invalidationEvents = useMemo(
    () => ['RewardsController:leaderboardPositionInvalidated'] as const,
    [],
  );
  useInvalidateByRewardEvents(invalidationEvents, fetchPosition);

  return { position, isLoading, hasError, hasFetched, refetch: fetchPosition };
};

export default useGetPredictThePitchLeaderboardPosition;
