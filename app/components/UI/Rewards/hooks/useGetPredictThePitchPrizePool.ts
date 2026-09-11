import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPredictThePitchPrizePoolByCampaignId,
  selectPredictThePitchPrizePoolLoadingByCampaignId,
  selectPredictThePitchPrizePoolErrorByCampaignId,
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

  const selectPrizePool = useMemo(
    () => selectPredictThePitchPrizePoolByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectPredictThePitchPrizePoolLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectPredictThePitchPrizePoolErrorByCampaignId(campaignId),
    [campaignId],
  );

  const prizePool = useSelector(selectPrizePool);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchPrizePool = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      return;
    }

    try {
      dispatch(
        setPredictThePitchPrizePoolLoading({ campaignId, loading: true }),
      );
      dispatch(setPredictThePitchPrizePoolError({ campaignId, error: false }));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPredictThePitchPrizePool',
        campaignId,
      );
      dispatch(setPredictThePitchPrizePool({ campaignId, prizePool: result }));
    } catch {
      dispatch(setPredictThePitchPrizePoolError({ campaignId, error: true }));
    } finally {
      dispatch(
        setPredictThePitchPrizePoolLoading({ campaignId, loading: false }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  return { prizePool, isLoading, hasError, refetch: fetchPrizePool };
};

export default useGetPredictThePitchPrizePool;
