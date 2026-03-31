import type { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayStrategy,
  // TODO: Remove @ts-expect-error below once @metamask/transaction-pay-controller
  // is bumped to the version containing FiatStrategy, orderCode, and updated
  // getStrategy signature.
  TransactionFiatPayment,
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
      getStrategy,
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
  transactionData?: {
    fiatPayment?: TransactionFiatPayment;
  },
): TransactionPayStrategy {
  if (transactionData?.fiatPayment?.selectedPaymentMethodId) {
    // @ts-expect-error TransactionPayStrategy.Fiat not available until dep bump
    return TransactionPayStrategy.Fiat;
  }

  return TransactionPayStrategy.Relay;
}
