import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectOndoCampaignDeposits,
  selectOndoCampaignDepositsLoading,
  selectOndoCampaignDepositsError,
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
  const deposits = useSelector(selectOndoCampaignDeposits);
  const isLoading = useSelector(selectOndoCampaignDepositsLoading);
  const hasError = useSelector(selectOndoCampaignDepositsError);

  const fetchDeposits = useCallback(async (): Promise<void> => {
    if (!campaignId) {
      dispatch(setOndoCampaignDepositsLoading(false));
      dispatch(setOndoCampaignDepositsError(false));
      return;
    }

    try {
      dispatch(setOndoCampaignDepositsLoading(true));
      dispatch(setOndoCampaignDepositsError(false));
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignDeposits',
        campaignId,
      );
      dispatch(setOndoCampaignDeposits(result));
    } catch {
      dispatch(setOndoCampaignDepositsError(true));
    } finally {
      dispatch(setOndoCampaignDepositsLoading(false));
    }
  }, [dispatch, campaignId]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  return { deposits, isLoading, hasError, refetch: fetchDeposits };
};

export default useGetOndoCampaignDeposits;
