import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryFunction,
  type QueryKey,
} from '@tanstack/react-query';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { cardQueries } from '../queries';
import Engine from '../../../../core/Engine';
import { cardNetworkInfos } from '../constants';
import { safeFormatChainIdToHex } from '../util/safeFormatChainIdToHex';
import type { CardNetwork } from '../types';
import type {
  CashbackWalletResponse,
  CashbackWithdrawEstimationResponse,
  CashbackWithdrawResponse,
  CreditWalletResponse,
  CreditWithdrawResponse,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export type RedeemableWalletMode = 'cashback' | 'credit';

type MonitoringStatus = 'idle' | 'monitoring' | 'success' | 'failed';
type RedeemableWalletResponse = CashbackWalletResponse | CreditWalletResponse;
type RedeemableWithdrawEstimationResponse = CashbackWithdrawEstimationResponse;
type RedeemableWithdrawResponse =
  | CashbackWithdrawResponse
  | CreditWithdrawResponse;
interface RedeemableQueryOptions<TResponse> {
  queryKey: QueryKey;
  queryFn: QueryFunction<TResponse>;
  staleTime: number;
}

const TX_POLLING_INTERVAL_MS = 5000;
const TX_POLLING_TIMEOUT_MS = 3 * 60 * 1000;

const resolvePollingChainId = (network?: string): string | undefined => {
  const info = network ? cardNetworkInfos[network as CardNetwork] : undefined;
  return info?.caipChainId
    ? safeFormatChainIdToHex(info.caipChainId)
    : undefined;
};

const withdrawForMode = (mode: RedeemableWalletMode, amount: string) =>
  mode === 'credit'
    ? Engine.context.CardController.withdrawCredit({ amount })
    : Engine.context.CardController.withdrawCashback({ amount });

const walletOptionsForMode = (
  mode: RedeemableWalletMode,
): RedeemableQueryOptions<RedeemableWalletResponse> =>
  mode === 'credit'
    ? {
        queryKey: cardQueries.credit.keys.wallet(),
        queryFn: async () => Engine.context.CardController.getCreditWallet(),
        staleTime: 0,
      }
    : {
        queryKey: cardQueries.cashback.keys.wallet(),
        queryFn: async () => Engine.context.CardController.getCashbackWallet(),
        staleTime: 0,
      };

const withdrawEstimationOptionsForMode = (
  mode: RedeemableWalletMode,
): RedeemableQueryOptions<RedeemableWithdrawEstimationResponse> =>
  mode === 'credit'
    ? {
        queryKey: cardQueries.credit.keys.withdrawEstimation(),
        queryFn: async () =>
          Engine.context.CardController.getCreditWithdrawEstimation(),
        staleTime: 0,
      }
    : {
        queryKey: cardQueries.cashback.keys.withdrawEstimation(),
        queryFn: async () =>
          Engine.context.CardController.getCashbackWithdrawEstimation(),
        staleTime: 0,
      };

const queryKeyForMode = (mode: RedeemableWalletMode): QueryKey =>
  mode === 'credit'
    ? cardQueries.credit.keys.all()
    : cardQueries.cashback.keys.all();

const useRedeemableWallet = (mode: RedeemableWalletMode) => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const queryClient = useQueryClient();
  const walletOptions = useMemo(() => walletOptionsForMode(mode), [mode]);
  const withdrawEstimationOptions = useMemo(
    () => withdrawEstimationOptionsForMode(mode),
    [mode],
  );
  const modeQueryKey = useMemo(() => queryKeyForMode(mode), [mode]);

  const walletQuery = useQuery<RedeemableWalletResponse>({
    queryKey: walletOptions.queryKey,
    queryFn: walletOptions.queryFn,
    enabled: isAuthenticated,
    staleTime: walletOptions.staleTime,
  });

  const estimationQuery = useQuery<RedeemableWithdrawEstimationResponse>({
    queryKey: withdrawEstimationOptions.queryKey,
    queryFn: withdrawEstimationOptions.queryFn,
    enabled: false,
    staleTime: withdrawEstimationOptions.staleTime,
  });

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

  const fetchEstimation = useCallback(
    async () =>
      queryClient.fetchQuery<RedeemableWithdrawEstimationResponse>({
        queryKey: withdrawEstimationOptions.queryKey,
        queryFn: withdrawEstimationOptions.queryFn,
        staleTime: withdrawEstimationOptions.staleTime,
      }),
    [queryClient, withdrawEstimationOptions],
  );

  const startTxPolling = useCallback(
    (hash: string, chainId: string) => {
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
            NetworkController.findNetworkClientIdByChainId(
              chainId as `0x${string}`,
            ),
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
                  queryKey: modeQueryKey,
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
    [queryClient, modeQueryKey],
  );

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string): Promise<RedeemableWithdrawResponse> =>
      withdrawForMode(mode, amount),
    onSuccess: (data) => {
      const chainId = resolvePollingChainId(estimationQuery.data?.network);
      if (chainId) {
        startTxPolling(data.txHash, chainId);
      }
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
    wallet: walletQuery.data ?? null,
    isLoading: walletQuery.isLoading && walletQuery.isFetching,
    error: walletQuery.error,
    fetchWallet: walletQuery.refetch,

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

export default useRedeemableWallet;
