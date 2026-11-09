import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectMoneyAccountSweepstakesVolumeStatsByCampaignId,
  selectMoneyAccountSweepstakesVolumeStatsLoadingByCampaignId,
  selectMoneyAccountSweepstakesVolumeStatsErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setMoneyAccountSweepstakesVolumeStats,
  setMoneyAccountSweepstakesVolumeStatsLoading,
  setMoneyAccountSweepstakesVolumeStatsError,
} from '../../../../reducers/rewards';
import type { MoneyAccountSweepstakesVolumeStatsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetMoneyAccountSweepstakesVolumeStatsResult {
  volumeStats: MoneyAccountSweepstakesVolumeStatsDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetMoneyAccountSweepstakesVolumeStats = (
  campaignId: string | undefined,
): UseGetMoneyAccountSweepstakesVolumeStatsResult => {
  const dispatch = useDispatch();

  const selectVolumeStats = useMemo(
    () => selectMoneyAccountSweepstakesVolumeStatsByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () =>
      selectMoneyAccountSweepstakesVolumeStatsLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectMoneyAccountSweepstakesVolumeStatsErrorByCampaignId(campaignId),
    [campaignId],
  );

  const volumeStats = useSelector(selectVolumeStats);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchVolumeStats = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      return;
    }

    try {
      dispatch(
        setMoneyAccountSweepstakesVolumeStatsLoading({
          campaignId,
          loading: true,
        }),
      );
      dispatch(
        setMoneyAccountSweepstakesVolumeStatsError({
          campaignId,
          error: false,
        }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getMoneyAccountSweepstakesVolumeStats',
        campaignId,
      );
      dispatch(
        setMoneyAccountSweepstakesVolumeStats({
          campaignId,
          volumeStats: result,
        }),
      );
    } catch {
      dispatch(
        setMoneyAccountSweepstakesVolumeStatsError({
          campaignId,
          error: true,
        }),
      );
    } finally {
      dispatch(
        setMoneyAccountSweepstakesVolumeStatsLoading({
          campaignId,
          loading: false,
        }),
      );
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchVolumeStats();
  }, [fetchVolumeStats]);

  return { volumeStats, isLoading, hasError, refetch: fetchVolumeStats };
};

export default useGetMoneyAccountSweepstakesVolumeStats;
