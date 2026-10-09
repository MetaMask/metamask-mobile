import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignPrizePoolByCampaignId,
  selectPerpsTradingCampaignPrizePoolLoadingByCampaignId,
  selectPerpsTradingCampaignPrizePoolErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
} from '../../../../reducers/rewards';
import type { PerpsTradingCampaignPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetPerpsTradingCampaignPrizePoolResult {
  prizePool: PerpsTradingCampaignPrizePoolDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPerpsTradingCampaignPrizePool = (
  campaignId: string | undefined,
): UseGetPerpsTradingCampaignPrizePoolResult => {
  const dispatch = useDispatch();

  const selectPrizePool = useMemo(
    () => selectPerpsTradingCampaignPrizePoolByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectPerpsTradingCampaignPrizePoolLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectPerpsTradingCampaignPrizePoolErrorByCampaignId(campaignId),
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
        setPerpsTradingCampaignPrizePoolLoading({ campaignId, loading: true }),
      );
      dispatch(
        setPerpsTradingCampaignPrizePoolError({ campaignId, error: false }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignPrizePool',
        campaignId,
      );
      dispatch(
        setPerpsTradingCampaignPrizePool({ campaignId, prizePool: result }),
      );
    } catch {
      dispatch(
        setPerpsTradingCampaignPrizePoolError({ campaignId, error: true }),
      );
    } finally {
      dispatch(
        setPerpsTradingCampaignPrizePoolLoading({ campaignId, loading: false }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  return { prizePool, isLoading, hasError, refetch: fetchPrizePool };
};

export default useGetPerpsTradingCampaignPrizePool;
