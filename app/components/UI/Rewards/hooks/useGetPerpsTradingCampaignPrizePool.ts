import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectPerpsTradingCampaignPrizePool,
  selectPerpsTradingCampaignPrizePoolLoading,
  selectPerpsTradingCampaignPrizePoolError,
} from '../../../../reducers/rewards/selectors';
import {
  setPerpsTradingCampaignPrizePool,
  setPerpsTradingCampaignPrizePoolLoading,
  setPerpsTradingCampaignPrizePoolError,
} from '../../../../reducers/rewards';

export interface UseGetPerpsTradingCampaignPrizePoolResult {
  prizePool: ReturnType<typeof selectPerpsTradingCampaignPrizePool>;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetPerpsTradingCampaignPrizePool = (
  campaignId: string | undefined,
): UseGetPerpsTradingCampaignPrizePoolResult => {
  const dispatch = useDispatch();
  const prizePool = useSelector(selectPerpsTradingCampaignPrizePool);
  const isLoading = useSelector(selectPerpsTradingCampaignPrizePoolLoading);
  const hasError = useSelector(selectPerpsTradingCampaignPrizePoolError);

  const fetchPrizePool = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setPerpsTradingCampaignPrizePoolLoading(false));
      dispatch(setPerpsTradingCampaignPrizePoolError(false));
      return;
    }

    try {
      dispatch(setPerpsTradingCampaignPrizePoolLoading(true));
      dispatch(setPerpsTradingCampaignPrizePoolError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getPerpsTradingCampaignPrizePool',
        campaignId,
      );
      dispatch(setPerpsTradingCampaignPrizePool(result));
    } catch {
      dispatch(setPerpsTradingCampaignPrizePoolError(true));
    } finally {
      dispatch(setPerpsTradingCampaignPrizePoolLoading(false));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  return { prizePool, isLoading, hasError, refetch: fetchPrizePool };
};

export default useGetPerpsTradingCampaignPrizePool;
