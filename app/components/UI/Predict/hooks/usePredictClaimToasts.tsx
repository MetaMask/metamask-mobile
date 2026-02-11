import { TransactionType } from '@metamask/transaction-controller';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectPredictWonPositions } from '../selectors/predictController';
import { PredictPosition } from '../types';
import { formatPrice } from '../utils/format';
import { usePredictClaim } from './usePredictClaim';
import { usePredictPositions } from './usePredictPositions';
import { usePredictToasts } from './usePredictToasts';
import Engine from '../../../../core/Engine';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { useQueryClient } from '@tanstack/react-query';
import { predictQueries } from '../queries';

export const usePredictClaimToasts = () => {
  const queryClient = useQueryClient();
  const { claim } = usePredictClaim();
  const { loadPositions } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
  });
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '0x0';
  const wonPositions = useSelector(
    selectPredictWonPositions({ address: selectedAddress }),
  );

  const totalClaimableAmount = useMemo(
    () =>
      wonPositions.reduce(
        (sum: number, position: PredictPosition) => sum + position.currentValue,
        0,
      ),
    [wonPositions],
  );

  const formattedAmount = formatPrice(totalClaimableAmount, {
    maximumDecimals: 2,
  });

  const handleClaimConfirmed = useCallback(() => {
    Engine.context.PredictController.confirmClaim({
      providerId: 'polymarket',
    });
    loadPositions({ isRefresh: true }).catch(() => {
      // Ignore errors when refreshing positions
    });
    queryClient.invalidateQueries({
      queryKey: predictQueries.balance.keys.all(),
    });
  }, [loadPositions, queryClient]);

  usePredictToasts({
    transactionType: TransactionType.predictClaim,
    pendingToastConfig: {
      title: strings('predict.claim.toasts.pending.title', {
        amount: '{amount}',
      }),
      description: strings('predict.claim.toasts.pending.description', {
        time: 5,
      }),
      getAmount: () => formattedAmount,
    },
    confirmedToastConfig: {
      title: strings('predict.deposit.account_ready'),
      description: strings('predict.deposit.account_ready_description', {
        amount: '{amount}',
      }),
      getAmount: () => formattedAmount,
    },
    errorToastConfig: {
      title: strings('predict.claim.toasts.error.title'),
      description: strings('predict.claim.toasts.error.description'),
      retryLabel: strings('predict.claim.toasts.error.try_again'),
      onRetry: claim,
    },
    onConfirmed: handleClaimConfirmed,
  });
};
