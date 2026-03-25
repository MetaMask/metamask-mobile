import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectOndoCampaignLeaderboardPositionById } from '../../../../reducers/rewards/selectors';
import {
  setOndoCampaignLeaderboardPosition,
  setOndoCampaignLeaderboardPositionLoading,
  setOndoCampaignLeaderboardPositionError,
} from '../../../../reducers/rewards';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetOndoLeaderboardPositionResult {
  /** User's leaderboard position, or null when not found/not yet loaded */
  position: CampaignLeaderboardPositionDto | null;
  /** Whether the position is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the position */
  hasError: boolean;
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
  const position = useSelector(
    selectOndoCampaignLeaderboardPositionById(campaignId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchPosition = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      dispatch(setOndoCampaignLeaderboardPositionLoading(true));
      dispatch(setOndoCampaignLeaderboardPositionError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignLeaderboardPosition',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setOndoCampaignLeaderboardPosition({ campaignId, position: result }),
      );
    } catch {
      setHasError(true);
      dispatch(setOndoCampaignLeaderboardPositionError(true));
    } finally {
      setIsLoading(false);
      dispatch(setOndoCampaignLeaderboardPositionLoading(false));
    }
  }, [dispatch, subscriptionId, campaignId]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  return { position, isLoading, hasError, refetch: fetchPosition };
};

export default useGetOndoLeaderboardPosition;
