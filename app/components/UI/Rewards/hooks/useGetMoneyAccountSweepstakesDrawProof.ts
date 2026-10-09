import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectMoneyAccountSweepstakesDrawProofByCampaignId,
  selectMoneyAccountSweepstakesDrawProofLoadingByCampaignId,
  selectMoneyAccountSweepstakesDrawProofErrorByCampaignId,
} from '../../../../reducers/rewards/selectors';
import {
  setMoneyAccountSweepstakesDrawProof,
  setMoneyAccountSweepstakesDrawProofLoading,
  setMoneyAccountSweepstakesDrawProofError,
} from '../../../../reducers/rewards';
import type { MoneyAccountSweepstakesDrawProofDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseGetMoneyAccountSweepstakesDrawProofResult {
  drawProof: MoneyAccountSweepstakesDrawProofDto | null;
  isLoading: boolean;
  hasError: boolean;
  refetch: () => Promise<void>;
}

export const useGetMoneyAccountSweepstakesDrawProof = (
  campaignId: string | undefined,
  enabled: boolean = true,
): UseGetMoneyAccountSweepstakesDrawProofResult => {
  const dispatch = useDispatch();

  const selectDrawProof = useMemo(
    () => selectMoneyAccountSweepstakesDrawProofByCampaignId(campaignId),
    [campaignId],
  );
  const selectLoading = useMemo(
    () => selectMoneyAccountSweepstakesDrawProofLoadingByCampaignId(campaignId),
    [campaignId],
  );
  const selectError = useMemo(
    () => selectMoneyAccountSweepstakesDrawProofErrorByCampaignId(campaignId),
    [campaignId],
  );

  const drawProof = useSelector(selectDrawProof);
  const isLoading = useSelector(selectLoading);
  const hasError = useSelector(selectError);

  const fetchDrawProof = useCallback(async (): Promise<void> => {
    if (!campaignId || !enabled) {
      return;
    }

    try {
      dispatch(
        setMoneyAccountSweepstakesDrawProofLoading({
          campaignId,
          loading: true,
        }),
      );
      dispatch(
        setMoneyAccountSweepstakesDrawProofError({
          campaignId,
          error: false,
        }),
      );
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getMoneyAccountSweepstakesDrawProof',
        campaignId,
      );
      dispatch(
        setMoneyAccountSweepstakesDrawProof({
          campaignId,
          drawProof: result,
        }),
      );
    } catch {
      dispatch(
        setMoneyAccountSweepstakesDrawProofError({
          campaignId,
          error: true,
        }),
      );
    } finally {
      dispatch(
        setMoneyAccountSweepstakesDrawProofLoading({
          campaignId,
          loading: false,
        }),
      );
    }
  }, [dispatch, campaignId, enabled]);

  useEffect(() => {
    fetchDrawProof();
  }, [fetchDrawProof]);

  return { drawProof, isLoading, hasError, refetch: fetchDrawProof };
};

export default useGetMoneyAccountSweepstakesDrawProof;
