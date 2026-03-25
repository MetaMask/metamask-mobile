import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import {
  selectCampaignLeaderboard,
  selectCampaignLeaderboardLoading,
  selectCampaignLeaderboardError,
  selectCampaignLeaderboardTierNames,
  selectCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards/selectors';
import {
  setCampaignLeaderboard,
  setCampaignLeaderboardLoading,
  setCampaignLeaderboardError,
  setCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards';
import type {
  CampaignLeaderboardDto,
  CampaignLeaderboardTier,
} from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetCampaignLeaderboardOptions {
  /** The tier to initially select (e.g., from user's position). Falls back to first tier if not found. */
  defaultTier?: string | null;
}

export interface UseGetCampaignLeaderboardResult {
  /** Full leaderboard data, or null when not yet loaded */
  leaderboard: CampaignLeaderboardDto | null;
  /** Whether the leaderboard is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the leaderboard */
  hasError: boolean;
  /** List of available tier names (e.g., ['STARTER', 'MID', 'UPPER']) */
  tierNames: string[];
  /** Currently selected tier name */
  selectedTier: string | null;
  /** Leaderboard data for the currently selected tier */
  selectedTierData: CampaignLeaderboardTier | null;
  /** When the leaderboard was last computed (ISO string) */
  computedAt: string | null;
  /** Change the selected tier */
  setSelectedTier: (tier: string) => void;
  /** Manually re-fetch the leaderboard */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the campaign leaderboard showing top 20 participants per tier.
 * This is a public endpoint - no authentication required.
 * Results are cached for 5 minutes by the RewardsController.
 *
 * @param campaignId - The campaign ID to fetch leaderboard for
 * @param options - Optional configuration including defaultTier for initial selection
 */
export const useGetCampaignLeaderboard = (
  campaignId: string | undefined,
  options?: UseGetCampaignLeaderboardOptions,
): UseGetCampaignLeaderboardResult => {
  const { defaultTier } = options ?? {};
  const dispatch = useDispatch();

  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const leaderboard = useSelector(selectCampaignLeaderboard);
  const isLoading = useSelector(selectCampaignLeaderboardLoading);
  const hasError = useSelector(selectCampaignLeaderboardError);
  const tierNames = useSelector(selectCampaignLeaderboardTierNames);
  const selectedTier = useSelector(selectCampaignLeaderboardSelectedTier);

  // Track if we've already applied the defaultTier to avoid overriding user selection
  const hasAppliedDefaultTier = useRef(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!isCampaignsEnabled || !campaignId) {
      return;
    }

    try {
      dispatch(setCampaignLeaderboardLoading(true));
      dispatch(setCampaignLeaderboardError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignLeaderboard',
        campaignId,
      );
      dispatch(setCampaignLeaderboard(result));
    } catch {
      dispatch(setCampaignLeaderboardError(true));
    } finally {
      dispatch(setCampaignLeaderboardLoading(false));
    }
  }, [dispatch, isCampaignsEnabled, campaignId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Update selected tier when defaultTier becomes available (e.g., after position loads)
  // Only apply once - don't override subsequent user selections
  useEffect(() => {
    if (
      !hasAppliedDefaultTier.current &&
      defaultTier &&
      tierNames.includes(defaultTier)
    ) {
      hasAppliedDefaultTier.current = true;
      dispatch(setCampaignLeaderboardSelectedTier(defaultTier));
    }
  }, [defaultTier, tierNames, dispatch]);

  const setSelectedTier = useCallback(
    (tier: string) => {
      if (tierNames.includes(tier)) {
        dispatch(setCampaignLeaderboardSelectedTier(tier));
      }
    },
    [tierNames, dispatch],
  );

  const selectedTierData = useMemo(
    () => (selectedTier ? (leaderboard?.tiers[selectedTier] ?? null) : null),
    [selectedTier, leaderboard],
  );

  return {
    leaderboard,
    isLoading,
    hasError,
    tierNames,
    selectedTier,
    selectedTierData,
    computedAt: leaderboard?.computed_at ?? null,
    setSelectedTier,
    refetch: fetchLeaderboard,
  };
};

export default useGetCampaignLeaderboard;
