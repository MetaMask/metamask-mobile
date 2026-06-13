import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictThePitchPrizePool,
  selectPredictThePitchPrizePoolLoading,
  selectPredictThePitchPrizePoolError,
} from '../../../../reducers/rewards/selectors';
import {
  setPredictThePitchPrizePool,
  setPredictThePitchPrizePoolLoading,
  setPredictThePitchPrizePoolError,
} from '../../../../reducers/rewards';
import type { PredictThePitchPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetPredictThePitchPrizePoolResult {
  prizePool: PredictThePitchPrizePoolDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPredictThePitchPrizePool = (
  campaignId: string | undefined,
): UseGetPredictThePitchPrizePoolResult => {
  const dispatch = useDispatch();
  const prizePool = useSelector(selectPredictThePitchPrizePool);
  const isLoading = useSelector(selectPredictThePitchPrizePoolLoading);
  const hasError = useSelector(selectPredictThePitchPrizePoolError);

  const fetchPrizePool = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setPredictThePitchPrizePoolLoading(false));
      dispatch(setPredictThePitchPrizePoolError(false));
      return;
    }

    try {
      dispatch(setPredictThePitchPrizePoolLoading(true));
      dispatch(setPredictThePitchPrizePoolError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPredictThePitchPrizePool',
        campaignId,
      );
      dispatch(setPredictThePitchPrizePool(result));
    } catch {
      dispatch(setPredictThePitchPrizePoolError(true));
    } finally {
      dispatch(setPredictThePitchPrizePoolLoading(false));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  return { prizePool, isLoading, hasError, refetch: fetchPrizePool };
};

export default useGetPredictThePitchPrizePool;
