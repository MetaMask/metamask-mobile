import { TransactionType } from '@metamask/transaction-controller';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectPredictClaimablePositions } from '../selectors/predictController';
import { PredictPosition, PredictPositionStatus } from '../types';
import { formatPrice } from '../utils/format';
import { usePredictClaim } from './usePredictClaim';
import { usePredictPositions } from './usePredictPositions';
import { usePredictToasts } from './usePredictToasts';

export const usePredictClaimToasts = () => {
  const { claim } = usePredictClaim();
  const { loadPositions } = usePredictPositions({
    claimable: true,
    loadOnMount: true,
  });

  const claimablePositions = useSelector(selectPredictClaimablePositions);
  const wonPositions = useMemo(
    () =>
      claimablePositions.filter(
        (position) => position.status === PredictPositionStatus.WON,
      ),
    [claimablePositions],
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
    onConfirmed: () => {
      loadPositions({ isRefresh: true }).catch(() => {
        // Ignore errors when refreshing positions
      });
    },
  });
};
