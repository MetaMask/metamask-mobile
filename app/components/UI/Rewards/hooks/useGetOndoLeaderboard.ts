import { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignLeaderboardByCampaignId,
  selectOndoCampaignLeaderboardLoadingByCampaignId,
  selectOndoCampaignLeaderboardErrorByCampaignId,
  selectOndoCampaignLeaderboardSelectedTierByCampaignId,
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

  const selectLeaderboard = useMemo(
    () => selectOndoCampaignLeaderboardByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectOndoCampaignLeaderboardLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectOndoCampaignLeaderboardErrorByCampaignId(campaignId),
    [campaignId],
  );
  const selectSelectedTier = useMemo(
    () => selectOndoCampaignLeaderboardSelectedTierByCampaignId(campaignId),
    [campaignId],
  );

  const leaderboard = useSelector(selectLeaderboard);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);
  const [isLeaderboardNotYetComputed, setIsLeaderboardNotYetComputed] =
    useState(false);
  const selectedTier = useSelector(selectSelectedTier);

  // Track if we've already applied the defaultTier to avoid overriding user selection
  const hasAppliedDefaultTier = useRef(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      setIsLeaderboardNotYetComputed(false);
      return;
    }

    try {
      dispatch(
        setOndoCampaignLeaderboardLoading({ campaignId, loading: true }),
      );
      dispatch(setOndoCampaignLeaderboardError({ campaignId, error: false }));
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignLeaderboard',
        campaignId,
      );
      dispatch(setOndoCampaignLeaderboard({ campaignId, leaderboard: result }));
    } catch (error) {
      const is404 =
        error instanceof Error &&
        error.message.includes('Get campaign leaderboard failed: 404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(setOndoCampaignLeaderboardError({ campaignId, error: true }));
      }
    } finally {
      dispatch(
        setOndoCampaignLeaderboardLoading({ campaignId, loading: false }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Update selected tier when defaultTier becomes available (e.g., after position loads)
  // Only apply once - don't override subsequent user selections
  useEffect(() => {
    if (!hasAppliedDefaultTier.current && defaultTier && campaignId) {
      hasAppliedDefaultTier.current = true;
      dispatch(
        setOndoCampaignLeaderboardSelectedTier({
          campaignId,
          tier: defaultTier,
        }),
      );
    }
  }, [defaultTier, dispatch, campaignId]);

  const setSelectedTier = useCallback(
    (tier: string) => {
      if (!campaignId) {
        return;
      }
      dispatch(setOndoCampaignLeaderboardSelectedTier({ campaignId, tier }));
    },
    [dispatch, campaignId],
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
