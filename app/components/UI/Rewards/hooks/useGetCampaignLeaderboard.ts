import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import {
  selectCampaignLeaderboardById,
  selectCampaignLeaderboardLoadingById,
} from '../../../../reducers/rewards/selectors';
import {
  setCampaignLeaderboard,
  setCampaignLeaderboardLoading,
  setCampaignLeaderboardError,
} from '../../../../reducers/rewards';
import type { CampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetCampaignLeaderboardResult {
  /** Leaderboard data, or null when flag is disabled / not yet loaded */
  leaderboard: CampaignLeaderboardDto | null;
  /** Whether the leaderboard is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the leaderboard */
  hasError: boolean;
  /** Manually re-fetch the leaderboard */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the campaign leaderboard for a given campaign.
 * Returns null and skips the API call when the campaigns feature flag is off.
 * Leaderboard data is not cached (live data).
 */
export const useGetCampaignLeaderboard = (
  campaignId: string | undefined,
): UseGetCampaignLeaderboardResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const leaderboard = useSelector(selectCampaignLeaderboardById(campaignId));
  const isLoading = useSelector(
    selectCampaignLeaderboardLoadingById(campaignId),
  );
  const dispatch = useDispatch();
  const [hasError, setHasError] = useState(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!isCampaignsEnabled || !subscriptionId || !campaignId) {
      return;
    }

    try {
      dispatch(setCampaignLeaderboardLoading({ campaignId, loading: true }));
      setHasError(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getCampaignLeaderboard',
        campaignId,
        subscriptionId,
      );
      dispatch(setCampaignLeaderboard({ campaignId, leaderboard: result }));
      dispatch(setCampaignLeaderboardError({ campaignId, error: false }));
    } catch {
      setHasError(true);
      dispatch(setCampaignLeaderboardError({ campaignId, error: true }));
    } finally {
      dispatch(setCampaignLeaderboardLoading({ campaignId, loading: false }));
    }
  }, [dispatch, subscriptionId, isCampaignsEnabled, campaignId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refetch whenever a successful opt-in invalidates the cached status
  const campaignOptedInEvents = useMemo(
    () => ['RewardsController:campaignOptedIn'] as const,
    [],
  );
  useInvalidateByRewardEvents(campaignOptedInEvents, fetchLeaderboard);

  return { leaderboard, isLoading, hasError, refetch: fetchLeaderboard };
};

export default useGetCampaignLeaderboard;
