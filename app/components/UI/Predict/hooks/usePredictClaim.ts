import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClaimParams } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { RootState } from '../../../../reducers';
import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';

interface UsePredictClaimOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const usePredictClaim = (options: UsePredictClaimOptions = {}) => {
  const { onComplete, onError } = options;
  const [claiming, setClaiming] = useState<boolean>(false);
  const { claim: claimWinnings } = usePredictTrading();

  const selectClaimTransaction = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.claimTransaction,
  );
  const claimTransaction = useSelector(selectClaimTransaction);

  const completed = useMemo(() => {
    if (!claimTransaction) {
      return false;
    }

    return claimTransaction.status === 'confirmed';
  }, [claimTransaction]);

  const pending = useMemo(() => {
    if (!claimTransaction) {
      return false;
    }
    return claimTransaction.status === 'pending';
  }, [claimTransaction]);

  const loading = useMemo(() => claiming || pending, [claiming, pending]);

  const error = useMemo(() => {
    if (!claimTransaction) {
      return false;
    }
    return claimTransaction.status === 'error';
  }, [claimTransaction]);

  useEffect(() => {
    if (completed && claiming) {
      setClaiming(false);
      onComplete?.();
    }
  }, [completed, claiming, onComplete]);

  useEffect(() => {
    if (!claiming) {
      return;
    }

    if (error) {
      setClaiming(false);
      Engine.context.PredictController.clearClaimTransactions();
      onError?.(new Error('Error claiming winnings'));
      return;
    }
  }, [error, claiming, onError]);

  const claim = useCallback(
    async ({
      positions,
      providerId = 'polymarket',
    }: Omit<ClaimParams, 'providerId'> & { providerId?: string }) => {
      setClaiming(true);
      try {
        const result = await claimWinnings({ positions, providerId });
        return result;
      } catch (claimError) {
        onError?.(claimError as Error);
        setClaiming(false);
        return {
          success: false,
          error: claimError as Error,
        };
      }
    },
    [claimWinnings, onError],
  );

  return {
    claim,
    loading,
    completed,
    error,
  };
};
