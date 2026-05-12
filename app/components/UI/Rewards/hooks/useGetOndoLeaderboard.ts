import { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignLeaderboard,
  selectOndoCampaignLeaderboardLoading,
  selectOndoCampaignLeaderboardError,
  selectOndoCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards/selectors';
import {
  setOndoCampaignLeaderboard,
  setOndoCampaignLeaderboardLoading,
  setOndoCampaignLeaderboardError,
  setOndoCampaignLeaderboardSelectedTier,
} from '../../../../reducers/rewards';
import type {
  CampaignLeaderboardDto,
  CampaignLeaderboardTier,
} from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetOndoLeaderboardOptions {
  /** The tier to initially select (e.g., from user's position). Falls back to first tier if not found. */
  defaultTier?: string | null;
}

export interface UseGetOndoLeaderboardResult {
  /** Full leaderboard data, or null when not yet loaded */
  leaderboard: CampaignLeaderboardDto | null;
  /** Whether the leaderboard is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the leaderboard */
  hasError: boolean;
  /** Whether the leaderboard hasn't been computed yet by the backend (404) */
  isLeaderboardNotYetComputed: boolean;
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
export const useGetOndoLeaderboard = (
  campaignId: string | undefined,
  options?: UseGetOndoLeaderboardOptions,
): UseGetOndoLeaderboardResult => {
  const { defaultTier } = options ?? {};
  const dispatch = useDispatch();

  const leaderboard = useSelector(selectOndoCampaignLeaderboard);
  const isLoading = useSelector(selectOndoCampaignLeaderboardLoading);
  const hasError = useSelector(selectOndoCampaignLeaderboardError);
  const [isLeaderboardNotYetComputed, setIsLeaderboardNotYetComputed] =
    useState(false);
  const selectedTier = useSelector(selectOndoCampaignLeaderboardSelectedTier);

  // Track if we've already applied the defaultTier to avoid overriding user selection
  const hasAppliedDefaultTier = useRef(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setOndoCampaignLeaderboardLoading(false));
      dispatch(setOndoCampaignLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      return;
    }

    try {
      dispatch(setOndoCampaignLeaderboardLoading(true));
      dispatch(setOndoCampaignLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignLeaderboard',
        campaignId,
      );
      dispatch(setOndoCampaignLeaderboard(result));
    } catch (error) {
      const is404 =
        error instanceof Error &&
        error.message.includes('Get campaign leaderboard failed: 404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(setOndoCampaignLeaderboardError(true));
      }
    } finally {
      dispatch(setOndoCampaignLeaderboardLoading(false));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Update selected tier when defaultTier becomes available (e.g., after position loads)
  // Only apply once - don't override subsequent user selections
  useEffect(() => {
    if (!hasAppliedDefaultTier.current && defaultTier) {
      hasAppliedDefaultTier.current = true;
      dispatch(setOndoCampaignLeaderboardSelectedTier(defaultTier));
    }
  }, [defaultTier, dispatch]);

  const setSelectedTier = useCallback(
    (tier: string) => {
      dispatch(setOndoCampaignLeaderboardSelectedTier(tier));
    },
    [dispatch],
  );

  const selectedTierData = useMemo(
    () => (selectedTier ? (leaderboard?.tiers[selectedTier] ?? null) : null),
    [selectedTier, leaderboard],
  );

  return {
    leaderboard,
    isLoading,
    hasError,
    isLeaderboardNotYetComputed,
    selectedTier,
    selectedTierData,
    computedAt: leaderboard?.computedAt ?? null,
    setSelectedTier,
    refetch: fetchLeaderboard,
  };
};

export default useGetOndoLeaderboard;
