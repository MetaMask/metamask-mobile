import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectMoneyAccountSweepstakesPrizePoolByCampaignId,
  selectMoneyAccountSweepstakesPrizePoolLoadingByCampaignId,
  selectMoneyAccountSweepstakesPrizePoolErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setMoneyAccountSweepstakesPrizePool,
  setMoneyAccountSweepstakesPrizePoolLoading,
  setMoneyAccountSweepstakesPrizePoolError,
} from '../../../../reducers/rewards';
import type { MoneyAccountSweepstakesPrizePoolDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetMoneyAccountSweepstakesPrizePoolResult {
  prizePool: MoneyAccountSweepstakesPrizePoolDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetMoneyAccountSweepstakesPrizePool = (
  campaignId: string | undefined,
): UseGetMoneyAccountSweepstakesPrizePoolResult => {
  const dispatch = useDispatch();

  const selectPrizePool = useMemo(
    () => selectMoneyAccountSweepstakesPrizePoolByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectMoneyAccountSweepstakesPrizePoolLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectMoneyAccountSweepstakesPrizePoolErrorByCampaignId(campaignId),
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
        setMoneyAccountSweepstakesPrizePoolLoading({
          campaignId,
          loading: true,
        }),
      );
      dispatch(
        setMoneyAccountSweepstakesPrizePoolError({
          campaignId,
          error: false,
        }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getMoneyAccountSweepstakesPrizePool',
        campaignId,
      );
      dispatch(
        setMoneyAccountSweepstakesPrizePool({ campaignId, prizePool: result }),
      );
    } catch {
      dispatch(
        setMoneyAccountSweepstakesPrizePoolError({
          campaignId,
          error: true,
        }),
      );
    } finally {
      dispatch(
        setMoneyAccountSweepstakesPrizePoolLoading({
          campaignId,
          loading: false,
        }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchPrizePool();
  }, [fetchPrizePool]);

  return { prizePool, isLoading, hasError, refetch: fetchPrizePool };
};

export default useGetMoneyAccountSweepstakesPrizePool;
