import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { usePredictDeposit } from './usePredictDeposit';
import { usePredictToasts } from './usePredictToasts';

export const usePredictDepositToasts = () => {
  const { deposit } = usePredictDeposit();

  usePredictToasts({
    transactionType: TransactionType.predictDeposit,
    pendingToastConfig: {
      title: strings('predict.deposit.adding_funds'),
      description: strings('predict.deposit.estimated_processing_time', {
        time: 30,
      }),
    },
    confirmedToastConfig: {
      title: strings('predict.deposit.account_ready'),
      description: strings('predict.deposit.account_ready_description', {
        amount: '{amount}',
      }),
      getAmount: (transactionMeta) =>
        transactionMeta.metamaskPay?.totalFiat ?? 'Balance',
    },
    errorToastConfig: {
      title: strings('predict.deposit.error_title'),
      description: strings('predict.deposit.error_description'),
      retryLabel: strings('predict.deposit.try_again'),
      onRetry: deposit,
    },
    clearTransaction: () =>
      Engine.context.PredictController.clearDepositTransaction(),
  });
};
