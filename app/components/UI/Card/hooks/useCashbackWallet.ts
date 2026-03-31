import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { cardQueries } from '../queries';

type MonitoringStatus = 'idle' | 'monitoring' | 'success' | 'failed';

const TX_POLLING_INTERVAL_MS = 5000;
const TX_POLLING_TIMEOUT_MS = 3 * 60 * 1000;

const useCashbackWallet = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const { sdk } = useCardSDK();
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    ...cardQueries.cashback.walletOptions(sdk),
    enabled: !!sdk && isAuthenticated,
  });

  const estimationQuery = useQuery(
    cardQueries.cashback.withdrawEstimationOptions(sdk),
  );

  const [monitoringStatus, setMonitoringStatus] =
    useState<MonitoringStatus>('idle');
  const [monitoringError, setMonitoringError] = useState<Error | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const pollingStartTimeRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    },
    [],
  );

  const fetchEstimation = useCallback(async () => {
    const opts = cardQueries.cashback.withdrawEstimationOptions(sdk);
    return queryClient.fetchQuery({
      queryKey: opts.queryKey,
      queryFn: opts.queryFn,
      staleTime: opts.staleTime,
    });
  }, [queryClient, sdk]);

  const startTxPolling = useCallback(
    (hash: string) => {
      if (!sdk || pollingIntervalRef.current) {
        return;
      }

      setMonitoringStatus('monitoring');
      setMonitoringError(null);
      pollingStartTimeRef.current = Date.now();

      pollingIntervalRef.current = setInterval(async () => {
        if (
          pollingStartTimeRef.current &&
          Date.now() - pollingStartTimeRef.current > TX_POLLING_TIMEOUT_MS
        ) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setMonitoringStatus('failed');
          setMonitoringError(new Error('Transaction monitoring timed out'));
          return;
        }

        try {
          const receipt = await sdk.getTransactionReceipt(hash);
          if (receipt) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            if (receipt.status === 1) {
              setMonitoringStatus('success');
              queryClient.invalidateQueries({
                queryKey: cardQueries.cashback.keys.all(),
              });
            } else {
              setMonitoringStatus('failed');
              setMonitoringError(new Error('Transaction reverted on-chain'));
            }
          }
        } catch {
          // continue polling on transient errors
        }
      }, TX_POLLING_INTERVAL_MS);
    },
    [sdk, queryClient],
  );

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!sdk) throw new Error('CardSDK not available');
      return sdk.withdrawCashback({ amount });
    },
    onSuccess: (data) => {
      startTxPolling(data.txHash);
    },
  });

  const resetMutation = withdrawMutation.reset;

  const resetWithdraw = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setMonitoringStatus('idle');
    setMonitoringError(null);
    resetMutation();
  }, [resetMutation]);

  return {
    cashbackWallet: walletQuery.data ?? null,
    isLoading: walletQuery.isLoading,
    error: walletQuery.error,
    fetchCashbackWallet: walletQuery.refetch,

    estimation: estimationQuery.data ?? null,
    isEstimating: estimationQuery.isFetching,
    estimationError: estimationQuery.error,
    fetchEstimation,

    withdraw: withdrawMutation.mutate,
    isWithdrawing: withdrawMutation.isPending,
    withdrawError: withdrawMutation.error,
    txHash: withdrawMutation.data?.txHash ?? null,

    monitoringStatus,
    monitoringError,
    resetWithdraw,
  };
};

export default useCashbackWallet;
