import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictThePitchLeaderboard,
  selectPredictThePitchLeaderboardLoading,
  selectPredictThePitchLeaderboardError,
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
  const leaderboard = useSelector(selectPredictThePitchLeaderboard);
  const isLoading = useSelector(selectPredictThePitchLeaderboardLoading);
  const hasError = useSelector(selectPredictThePitchLeaderboardError);
  const [isLeaderboardNotYetComputed, setIsLeaderboardNotYetComputed] =
    useState(false);

  const fetchLeaderboard = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setPredictThePitchLeaderboardLoading(false));
      dispatch(setPredictThePitchLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      return;
    }

    try {
      dispatch(setPredictThePitchLeaderboardLoading(true));
      dispatch(setPredictThePitchLeaderboardError(false));
      setIsLeaderboardNotYetComputed(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPredictThePitchLeaderboard',
        campaignId,
      );
      dispatch(setPredictThePitchLeaderboard(result));
    } catch (error) {
      const is404 = error instanceof Error && error.message.includes('404');
      if (is404) {
        setIsLeaderboardNotYetComputed(true);
      } else {
        dispatch(setPredictThePitchLeaderboardError(true));
      }
    } finally {
      dispatch(setPredictThePitchLeaderboardLoading(false));
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
