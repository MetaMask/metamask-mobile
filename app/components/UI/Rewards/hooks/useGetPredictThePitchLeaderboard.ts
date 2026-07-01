import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictThePitchLeaderboardByCampaignId,
  selectPredictThePitchLeaderboardLoadingByCampaignId,
  selectPredictThePitchLeaderboardErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchLeaderboard,
  setPredictThePitchLeaderboardLoading,
  setPredictThePitchLeaderboardError,
} from '../../../../reducers/rewards';
import type { PredictThePitchLeaderboardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetPredictThePitchLeaderboardResult {
  leaderboard: PredictThePitchLeaderboardDto | null;
  isLoading: boolean;
  hasError: boolean;
  isLeaderboardNotYetComputed: boolean;
  refetch: () => Promise<void>;
}

export const useGetPredictThePitchLeaderboard = (
  campaignId: string | undefined,
): UseGetPredictThePitchLeaderboardResult => {
  const dispatch = useDispatch();

  const selectLeaderboard = useMemo(
    () => selectPredictThePitchLeaderboardByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectPredictThePitchLeaderboardLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectPredictThePitchLeaderboardErrorByCampaignId(campaignId),
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
        setPredictThePitchLeaderboardLoading({ campaignId, loading: true }),
      );
      dispatch(
        setPredictThePitchLeaderboardError({ campaignId, error: false }),
      );
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPredictThePitchLeaderboard',
        campaignId,
      );
      dispatch(
        setPredictThePitchLeaderboard({ campaignId, leaderboard: result }),
      );
    } catch (error) {
      const is404 = error instanceof Error && error.message.includes('404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(
          setPredictThePitchLeaderboardError({ campaignId, error: true }),
        );
      }
    } finally {
      dispatch(
        setPredictThePitchLeaderboardLoading({ campaignId, loading: false }),
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

export default useGetPredictThePitchLeaderboard;
