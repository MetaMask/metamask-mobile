import { useGetCampaignLeaderboardPosition } from './useGetCampaignLeaderboardPosition';
import type { CampaignLeaderboardPositionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface OndoLeaderboardPositionData {
  rank: number;
  projected_tier: string;
  rate_of_return: number;
  total_usd_deposited: number;
  current_usd_value: number;
  computed_at: string;
}

export interface UseOndoLeaderboardPositionResult {
  /** Mapped position fields, or null when not yet loaded / not a participant */
  positionData: OndoLeaderboardPositionData | null;
  /** Whether the position is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the position */
  hasError: boolean;
  /** Manually re-fetch the position */
  refetch: () => Promise<void>;
}

const mapPosition = (
  p: CampaignLeaderboardPositionDto,
): OndoLeaderboardPositionData => ({
  rank: p.rank,
  projected_tier: p.projected_tier,
  rate_of_return: p.rate_of_return,
  total_usd_deposited: p.total_usd_deposited,
  current_usd_value: p.current_usd_value,
  computed_at: p.computed_at,
});

/**
 * Dedicated hook for the OndoLeaderboardPosition component.
 * Fetches the current user's position on the Ondo GM campaign leaderboard
 * and returns the fields required for display.
 */
export const useOndoLeaderboardPosition = (
  campaignId: string | undefined,
): UseOndoLeaderboardPositionResult => {
  const { position, isLoading, hasError, refetch } =
    useGetCampaignLeaderboardPosition(campaignId);

  return {
    positionData: position ? mapPosition(position) : null,
    isLoading,
    hasError,
    refetch,
  };
};

export default useOndoLeaderboardPosition;
