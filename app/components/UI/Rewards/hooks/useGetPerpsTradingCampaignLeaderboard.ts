import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignLeaderboardByCampaignId,
  selectPerpsTradingCampaignLeaderboardLoadingByCampaignId,
  selectPerpsTradingCampaignLeaderboardErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignLeaderboard,
  setPerpsTradingCampaignLeaderboardLoading,
  setPerpsTradingCampaignLeaderboardError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetPerpsTradingCampaignLeaderboardResult {
  leaderboard: PerpsTradingCampaignLeaderboardDto | null;
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed: boolean;
  refetch: () => Promise<void>;
}

export const useGetPerpsTradingCampaignLeaderboard = (
  campaignId: string | undefined,
): UseGetPerpsTradingCampaignLeaderboardResult => {
  const dispatch = useDispatch();

  const selectLeaderboard = useMemo(
    () => selectPerpsTradingCampaignLeaderboardByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectPerpsTradingCampaignLeaderboardLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectPerpsTradingCampaignLeaderboardErrorByCampaignId(campaignId),
    [campaignId],
  );

  const leaderboard = useSelector(selectLeaderboard);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);
  const [isLeaderboardNotYetComputed, setIsLeaderboardNotYetComputed] =
    useState(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      setIsLeaderboardNotYetComputed(false);
      return;
    }

    try {
      dispatch(
        setPerpsTradingCampaignLeaderboardLoading({
          campaignId,
          loading: true,
        }),
      );
      dispatch(
        setPerpsTradingCampaignLeaderboardError({ campaignId, error: false }),
      );
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignLeaderboard',
        campaignId,
      );
      dispatch(
        setPerpsTradingCampaignLeaderboard({
          campaignId,
          leaderboard: result,
        }),
      );
    } catch (error) {
      const is404 = error instanceof Error && error.message.includes('404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(
          setPerpsTradingCampaignLeaderboardError({ campaignId, error: true }),
        );
      }
    } finally {
      dispatch(
        setPerpsTradingCampaignLeaderboardLoading({
          campaignId,
          loading: false,
        }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    isLoading,
    hasError,
    isLeaderboardNotYetComputed,
    refetch: fetchLeaderboard,
  };
};

export default useGetPerpsTradingCampaignLeaderboard;
