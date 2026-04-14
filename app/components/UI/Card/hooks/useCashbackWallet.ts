import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { cardQueries } from '../queries';
import Engine from '../../../../core/Engine';

type MonitoringStatus = 'idle' | 'monitoring' | 'success' | 'failed';

const TX_POLLING_INTERVAL_MS = 5000;
const TX_POLLING_TIMEOUT_MS = 3 * 60 * 1000;

const useCashbackWallet = () => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const queryClient = useQueryClient();

  const walletQuery = useQuery({
    ...cardQueries.cashback.walletOptions(),
    enabled: isAuthenticated,
  });

  const estimationQuery = useQuery(
    cardQueries.cashback.withdrawEstimationOptions(),
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
    const opts = cardQueries.cashback.withdrawEstimationOptions();
    return queryClient.fetchQuery({
      queryKey: opts.queryKey,
      queryFn: opts.queryFn,
      staleTime: opts.staleTime,
    });
  }, [queryClient]);

  const startTxPolling = useCallback(
    (hash: string) => {
      if (pollingIntervalRef.current) {
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
          const { NetworkController } = Engine.context;
          const provider = NetworkController.getNetworkClientById(
            NetworkController.findNetworkClientIdByChainId('0xe708'),
          )?.provider;
          if (provider) {
            const receipt = await provider.request({
              method: 'eth_getTransactionReceipt',
              params: [hash],
            });
            if (receipt) {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              const status =
                typeof (receipt as { status?: string }).status === 'string'
                  ? parseInt((receipt as { status: string }).status, 16)
                  : (receipt as { status?: number }).status;
              if (status === 1) {
                setMonitoringStatus('success');
                queryClient.invalidateQueries({
                  queryKey: cardQueries.cashback.keys.all(),
                });
              } else {
                setMonitoringStatus('failed');
                setMonitoringError(new Error('Transaction reverted on-chain'));
              }
            }
          }
        } catch {
          // continue polling on transient errors
        }
      }, TX_POLLING_INTERVAL_MS);
    },
    [queryClient],
  );

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) =>
      Engine.context.CardController.withdrawCashback({ amount }),
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
    isLoading: walletQuery.isLoading && walletQuery.isFetching,
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
