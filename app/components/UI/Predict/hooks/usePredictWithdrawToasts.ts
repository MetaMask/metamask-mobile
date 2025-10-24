import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { usePredictWithdraw } from './usePredictWithdraw';
import { usePredictToasts } from './usePredictToasts';
import { PredictWithdrawStatus } from '../types';
import { useEffect } from 'react';

export const usePredictWithdrawToasts = () => {
  const { withdraw, withdrawTransaction } = usePredictWithdraw();

  const { showPendingToast } = usePredictToasts({
    transactionType: TransactionType.predictWithdraw,
    confirmedToastConfig: {
      title: strings('predict.withdraw.withdraw_completed'),
      description: strings('predict.withdraw.withdraw_completed_subtitle', {
        amount: '{amount}',
      }),
      getAmount: () => withdrawTransaction?.amount.toString() ?? '0',
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
        amount: withdrawTransaction?.amount.toString() ?? '0',
        config: {
          title: strings('predict.withdraw.withdrawing', {
            amount: '{amount}',
          }),
          description: strings('predict.withdraw.withdrawing_subtitle', {
            time: 30,
          }),
        },
      });
    }
  }, [
    withdrawTransaction?.amount,
    showPendingToast,
    withdrawTransaction?.status,
  ]);
};
