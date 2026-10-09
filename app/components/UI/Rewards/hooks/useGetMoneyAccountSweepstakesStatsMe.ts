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
    () =>
      selectMoneyAccountSweepstakesStatsByCampaignId(
        subscriptionId,
        campaignId,
      ),
    [subscriptionId, campaignId],
  );
  const selectLoading = useMemo(
    () =>
      selectMoneyAccountSweepstakesStatsLoadingByCampaignId(
        subscriptionId,
        campaignId,
      ),
    [subscriptionId, campaignId],
  );
  const selectError = useMemo(
    () =>
      selectMoneyAccountSweepstakesStatsErrorByCampaignId(
        subscriptionId,
        campaignId,
      ),
    [subscriptionId, campaignId],
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
        setMoneyAccountSweepstakesStatsLoading({
          subscriptionId,
          campaignId,
          loading: true,
        }),
      );
      dispatch(
        setMoneyAccountSweepstakesStatsError({
          subscriptionId,
          campaignId,
          error: false,
        }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getMoneyAccountSweepstakesStatsMe',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setMoneyAccountSweepstakesStats({
          subscriptionId,
          campaignId,
          stats: result,
        }),
      );
    } catch {
      dispatch(
        setMoneyAccountSweepstakesStatsError({
          subscriptionId,
          campaignId,
          error: true,
        }),
      );
    } finally {
      dispatch(
        setMoneyAccountSweepstakesStatsLoading({
          subscriptionId,
          campaignId,
          loading: false,
        }),
      );
    }
  }, [dispatch, campaignId, subscriptionId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, hasError, refetch: fetchStats };
};

export default useGetMoneyAccountSweepstakesStatsMe;
