import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignLeaderboard,
  selectPerpsTradingCampaignLeaderboardLoading,
  selectPerpsTradingCampaignLeaderboardError,
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
  const leaderboard = useSelector(selectPerpsTradingCampaignLeaderboard);
  const isLoading = useSelector(selectPerpsTradingCampaignLeaderboardLoading);
  const hasError = useSelector(selectPerpsTradingCampaignLeaderboardError);
  const [isLeaderboardNotYetComputed, setIsLeaderboardNotYetComputed] =
    useState(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setPerpsTradingCampaignLeaderboardLoading(false));
      dispatch(setPerpsTradingCampaignLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      return;
    }

    try {
      dispatch(setPerpsTradingCampaignLeaderboardLoading(true));
      dispatch(setPerpsTradingCampaignLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignLeaderboard',
        campaignId,
      );
      dispatch(setPerpsTradingCampaignLeaderboard(result));
    } catch (error) {
      const is404 = error instanceof Error && error.message.includes('404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(setPerpsTradingCampaignLeaderboardError(true));
      }
    } finally {
      dispatch(setPerpsTradingCampaignLeaderboardLoading(false));
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
