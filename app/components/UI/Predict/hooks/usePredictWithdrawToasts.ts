import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { usePredictWithdraw } from './usePredictWithdraw';
import { usePredictToasts } from './usePredictToasts';
import { PredictWithdrawStatus } from '../types';
import { useEffect } from 'react';
import { usePredictBalance } from './usePredictBalance';
import { formatPrice } from '../utils/format';

export const usePredictWithdrawToasts = () => {
  const { loadBalance } = usePredictBalance();
  const { withdraw, withdrawTransaction } = usePredictWithdraw();

  const { showPendingToast } = usePredictToasts({
    onConfirmed: () => {
      loadBalance({ isRefresh: true });
    },
    transactionType: TransactionType.predictWithdraw,
    confirmedToastConfig: {
      title: strings('predict.withdraw.withdraw_completed'),
      description: strings('predict.withdraw.withdraw_completed_subtitle', {
        amount: '{amount}',
      }),
      getAmount: () =>
        formatPrice(withdrawTransaction?.amount.toString() ?? '0'),
    },
    errorToastConfig: {
      title: strings('predict.withdraw.error_title'),
      description: strings('predict.withdraw.error_description'),
      retryLabel: strings('predict.withdraw.try_again'),
      onRetry: withdraw,
    },
    clearTransaction: () =>
      Engine.context.PredictController.clearWithdrawTransaction(),
  });

  useEffect(() => {
    if (withdrawTransaction?.status === PredictWithdrawStatus.PENDING) {
      showPendingToast({
        config: {
          title: strings('predict.withdraw.withdrawing'),
          description: strings('predict.withdraw.withdrawing_subtitle'),
        },
      });
    }
  }, [
    withdrawTransaction?.amount,
    showPendingToast,
    withdrawTransaction?.status,
  ]);
};
