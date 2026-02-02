import type { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayStrategy,
  type TransactionPayControllerMessenger,
  type TransactionData,
} from '@metamask/transaction-pay-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';

export const TransactionPayControllerInit: ControllerInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      getDelegationTransaction: ({ transaction }) =>
        getDelegationTransaction(initMessenger, transaction),
      getStrategy: (transaction, transactionData) =>
        getStrategy(transaction, transactionData),
      messenger: controllerMessenger,
      state: persistedState.TransactionPayController,
    });

    return { controller: transactionPayController };
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize TransactionPayController',
    );
    throw error;
  }
};

function getStrategy(
  _transaction: TransactionMeta,
  transactionData?: TransactionData,
): TransactionPayStrategy {
  const fiatPayment = transactionData?.fiatPayment;

  if (fiatPayment) {
    return TransactionPayStrategy.Fiat;
  }

  return TransactionPayStrategy.Relay;
}
