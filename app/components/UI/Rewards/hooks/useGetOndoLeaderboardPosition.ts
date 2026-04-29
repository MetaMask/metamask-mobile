import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectCampaignParticipantOptedIn,
} from '../../../../selectors/rewards';
import { selectOndoCampaignLeaderboardPositionById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignLeaderboardPosition } from '../../../../reducers/rewards';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetOndoLeaderboardPositionResult {
  /** User's leaderboard position, or null when not found/not yet loaded */
  position: CampaignLeaderboardPositionDto | null;
  /** Whether the position is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the position */
  hasError: boolean;
  /** Whether at least one fetch attempt has completed (success or error) */
  hasFetched: boolean;
  /** Manually re-fetch the position */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the current user's position on the Ondo campaign leaderboard.
 * This is an authenticated endpoint.
 * Results are cached for 5 minutes by the RewardsController.
 */
export const useGetOndoLeaderboardPosition = (
  campaignId: string | undefined,
): UseGetOndoLeaderboardPositionResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn = useSelector(
    selectCampaignParticipantOptedIn(subscriptionId, campaignId),
  );
  const position = useSelector(
    selectOndoCampaignLeaderboardPositionById(
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
        'RewardsController:getOndoCampaignLeaderboardPosition',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setOndoCampaignLeaderboardPosition({
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

  // Refetch whenever opting into a campaign invalidates the cached position
  const invalidationEvents = useMemo(
    () => ['RewardsController:leaderboardPositionInvalidated'] as const,
    [],
  );
  useInvalidateByRewardEvents(invalidationEvents, fetchPosition);

  return { position, isLoading, hasError, hasFetched, refetch: fetchPosition };
};

export default useGetOndoLeaderboardPosition;
