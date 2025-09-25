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

  const selectClaimTransactions = createSelector(
    (state: RootState) => state.engine.backgroundState.PredictController,
    (predictState) => predictState.claimTransactions,
  );
  const claimTransactions = useSelector(selectClaimTransactions);

  const completed = useMemo(() => {
    if (!claimTransactions) {
      return false;
    }

    const transactions = Object.values(claimTransactions);

    if (transactions.length === 0) {
      return false;
    }
    return transactions.every((txArray) => {
      if (!txArray || txArray.length === 0) {
        return false;
      }
      return txArray.every((tx) => tx.status === 'confirmed');
    });
  }, [claimTransactions]);

  const pending = useMemo(() => {
    if (!claimTransactions) {
      return false;
    }
    const transactions = Object.values(claimTransactions);
    return transactions.some((txArray) =>
      txArray?.some((tx) => tx.status === 'pending'),
    );
  }, [claimTransactions]);

  const loading = useMemo(() => claiming || pending, [claiming, pending]);

  const error = useMemo(() => {
    if (!claimTransactions) {
      return false;
    }
    const transactions = Object.values(claimTransactions);
    return transactions.some((txArray) => {
      if (!txArray) {
        return false;
      }
      return txArray.some((tx) => tx.status === 'error');
    });
  }, [claimTransactions]);

  const cancelled = useMemo(() => {
    if (!claimTransactions) {
      return false;
    }
    const transactions = Object.values(claimTransactions);
    return transactions.some((txArray) => {
      if (!txArray) {
        return false;
      }
      return txArray.some((tx) => tx.status === 'cancelled');
    });
  }, [claimTransactions]);

  // Get all positionIds from completed claim transactions
  const completedClaimPositionIds = useMemo(() => {
    if (!claimTransactions) {
      return new Set<string>();
    }

    const positionIds = new Set<string>();
    Object.values(claimTransactions).forEach((txArray) => {
      if (txArray) {
        txArray.forEach((tx) => {
          if (tx.status === 'confirmed') {
            positionIds.add(tx.positionId);
          }
        });
      }
    });
    return positionIds;
  }, [claimTransactions]);

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

    if (cancelled) {
      setClaiming(false);
      Engine.context.PredictController.clearClaimTransactions();
      onError?.(new Error('Claim cancelled'));
    }
  }, [error, claiming, onError, cancelled]);

  const claim = useCallback(
    async (claimParams: ClaimParams) => {
      setClaiming(true);
      try {
        const result = await claimWinnings(claimParams);
        if (!result.success) {
          throw new Error(result.error as string);
        }
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
    cancelled,
    completedClaimPositionIds,
  };
};
