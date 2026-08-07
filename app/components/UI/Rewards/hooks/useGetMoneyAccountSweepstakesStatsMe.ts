import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectMoneyAccountSweepstakesStatsByCampaignId,
  selectMoneyAccountSweepstakesStatsLoadingByCampaignId,
  selectMoneyAccountSweepstakesStatsErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setMoneyAccountSweepstakesStats,
  setMoneyAccountSweepstakesStatsLoading,
  setMoneyAccountSweepstakesStatsError,
} from '../../../../reducers/rewards';
import type { MoneyAccountSweepstakesStatsMeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetMoneyAccountSweepstakesStatsMeResult {
  stats: MoneyAccountSweepstakesStatsMeDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetMoneyAccountSweepstakesStatsMe = (
  campaignId: string | undefined,
): UseGetMoneyAccountSweepstakesStatsMeResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  const selectStats = useMemo(
    () => selectMoneyAccountSweepstakesStatsByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectMoneyAccountSweepstakesStatsLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectMoneyAccountSweepstakesStatsErrorByCampaignId(campaignId),
    [campaignId],
  );

  const stats = useSelector(selectStats);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchStats = useCallback(async (): Promise<void> => {
    if (!campaignId || !subscriptionId) {
      return;
    }

    try {
      dispatch(
        setMoneyAccountSweepstakesStatsLoading({ campaignId, loading: true }),
      );
      dispatch(
        setMoneyAccountSweepstakesStatsError({ campaignId, error: false }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getMoneyAccountSweepstakesStatsMe',
        campaignId,
        subscriptionId,
      );
      dispatch(setMoneyAccountSweepstakesStats({ campaignId, stats: result }));
    } catch {
      dispatch(
        setMoneyAccountSweepstakesStatsError({ campaignId, error: true }),
      );
    } finally {
      dispatch(
        setMoneyAccountSweepstakesStatsLoading({ campaignId, loading: false }),
      );
    }
  }, [dispatch, campaignId, subscriptionId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, hasError, refetch: fetchStats };
};

export default useGetMoneyAccountSweepstakesStatsMe;
