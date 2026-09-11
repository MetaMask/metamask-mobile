import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignDepositsByCampaignId,
  selectOndoCampaignDepositsLoadingByCampaignId,
  selectOndoCampaignDepositsErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setOndoCampaignDeposits,
  setOndoCampaignDepositsLoading,
  setOndoCampaignDepositsError,
} from '../../../../reducers/rewards';
import type { OndoGmCampaignDepositsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetOndoCampaignDepositsResult {
  deposits: OndoGmCampaignDepositsDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetOndoCampaignDeposits = (
  campaignId: string | undefined,
): UseGetOndoCampaignDepositsResult => {
  const dispatch = useDispatch();

  const selectDeposits = useMemo(
    () => selectOndoCampaignDepositsByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectOndoCampaignDepositsLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectOndoCampaignDepositsErrorByCampaignId(campaignId),
    [campaignId],
  );

  const deposits = useSelector(selectDeposits);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchDeposits = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      return;
    }

    try {
      dispatch(setOndoCampaignDepositsLoading({ campaignId, loading: true }));
      dispatch(setOndoCampaignDepositsError({ campaignId, error: false }));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignDeposits',
        campaignId,
      );
      dispatch(setOndoCampaignDeposits({ campaignId, deposits: result }));
    } catch {
      dispatch(setOndoCampaignDepositsError({ campaignId, error: true }));
    } finally {
      dispatch(setOndoCampaignDepositsLoading({ campaignId, loading: false }));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  return { deposits, isLoading, hasError, refetch: fetchDeposits };
};

export default useGetOndoCampaignDeposits;
