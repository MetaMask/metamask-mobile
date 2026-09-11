import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import {
  selectIsCardAuthenticated,
  selectCardRedeemWithdrawal,
} from '../../../../selectors/cardController';
import { cardQueries } from '../queries';
import {
  REDEEM_STALE_TIME_MS,
  shouldRetryRedeemQuery,
} from '../queries/redeemQueryDefaults';
import Engine from '../../../../core/Engine';
import type {
  RedeemWalletMode,
  RedeemWalletResponse,
  RedeemWithdrawEstimationResponse,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export type RedeemableWalletMode = RedeemWalletMode;

interface RedeemQueryConfig {
  queryKey: QueryKey;
  queryFn: () => Promise<RedeemWalletResponse>;
  estimationQueryKey: QueryKey;
  estimationQueryFn: () => Promise<RedeemWithdrawEstimationResponse>;
  allKey: QueryKey;
}

const REDEEM_QUERIES: Record<RedeemableWalletMode, RedeemQueryConfig> = {
  credit: {
    queryKey: cardQueries.credit.keys.wallet(),
    queryFn: () => Engine.context.CardController.getCreditWallet(),
    estimationQueryKey: cardQueries.credit.keys.withdrawEstimation(),
    estimationQueryFn: () =>
      Engine.context.CardController.getCreditWithdrawEstimation(),
    allKey: cardQueries.credit.keys.all(),
  },
  cashback: {
    queryKey: cardQueries.cashback.keys.wallet(),
    queryFn: () => Engine.context.CardController.getCashbackWallet(),
    estimationQueryKey: cardQueries.cashback.keys.withdrawEstimation(),
    estimationQueryFn: () =>
      Engine.context.CardController.getCashbackWithdrawEstimation(),
    allKey: cardQueries.cashback.keys.all(),
  },
};

const useRedeemableWallet = (mode: RedeemableWalletMode) => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const redeemWithdrawal = useSelector(selectCardRedeemWithdrawal);
  const queryClient = useQueryClient();
  const queries = REDEEM_QUERIES[mode];

  const walletQuery = useQuery({
    queryKey: queries.queryKey,
    queryFn: queries.queryFn,
    staleTime: REDEEM_STALE_TIME_MS,
    retry: shouldRetryRedeemQuery,
    enabled: isAuthenticated,
  });

  const estimationQuery = useQuery({
    queryKey: queries.estimationQueryKey,
    queryFn: queries.estimationQueryFn,
    staleTime: REDEEM_STALE_TIME_MS,
    retry: shouldRetryRedeemQuery,
    enabled: false,
  });

  const fetchEstimation = useCallback(
    async () =>
      queryClient.fetchQuery({
        queryKey: queries.estimationQueryKey,
        queryFn: queries.estimationQueryFn,
        staleTime: REDEEM_STALE_TIME_MS,
      }),
    [queryClient, queries],
  );

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) =>
      Engine.context.CardController.withdrawRedeemable({ mode, amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queries.allKey });
    },
  });

  const modeWithdrawal =
    redeemWithdrawal?.mode === mode ? redeemWithdrawal : null;

  // Shared controller lock — only one redeem can be in flight at a time.
  // Disable withdraw in every mode while any redeem is submitting/monitoring,
  // but keep monitoringStatus/txHash scoped to this mode for toasts/UI.
  const isAnyRedeemInFlight =
    redeemWithdrawal?.status === 'submitting' ||
    redeemWithdrawal?.status === 'monitoring';

  let monitoringStatus: 'monitoring' | 'success' | 'failed' | 'idle';
  if (
    modeWithdrawal?.status === 'submitting' ||
    modeWithdrawal?.status === 'monitoring'
  ) {
    monitoringStatus = 'monitoring';
  } else if (modeWithdrawal?.status === 'success') {
    monitoringStatus = 'success';
  } else if (modeWithdrawal?.status === 'failed') {
    monitoringStatus = 'failed';
  } else {
    monitoringStatus = 'idle';
  }

  // Stable identity so consumers don't re-toast on every render while failed.
  const monitoringErrorReason =
    modeWithdrawal?.status === 'failed'
      ? (modeWithdrawal.error?.reason ?? null)
      : null;
  const monitoringError = useMemo(
    () => (monitoringErrorReason ? new Error(monitoringErrorReason) : null),
    [monitoringErrorReason],
  );

  const resetMutation = withdrawMutation.reset;

  const resetWithdraw = useCallback(() => {
    Engine.context.CardController.clearRedeemWithdrawal();
    resetMutation();
  }, [resetMutation]);

  // Invalidate wallet cache when controller reports success (covers unmount case).
  useEffect(() => {
    if (modeWithdrawal?.status === 'success') {
      queryClient.invalidateQueries({ queryKey: queries.allKey });
    }
  }, [modeWithdrawal?.status, queries.allKey, queryClient]);

  // Controller already owns failed/monitoring/success outcomes — don't also
  // surface the mutation rejection as withdrawError (duplicate failure toasts).
  const withdrawError =
    monitoringStatus === 'idle' ? withdrawMutation.error : null;

  return {
    wallet: walletQuery.data ?? null,
    isLoading: walletQuery.isLoading,
    error: walletQuery.error,
    fetchWallet: walletQuery.refetch,

    estimation: estimationQuery.data ?? null,
    isEstimating: estimationQuery.isFetching,
    estimationError: estimationQuery.error,
    fetchEstimation,

    withdraw: withdrawMutation.mutate,
    isWithdrawing: withdrawMutation.isPending || isAnyRedeemInFlight,
    withdrawError,
    txHash: modeWithdrawal?.txHash ?? null,

    monitoringStatus,
    monitoringError,
    resetWithdraw,
  };
};

export default useRedeemableWallet;
