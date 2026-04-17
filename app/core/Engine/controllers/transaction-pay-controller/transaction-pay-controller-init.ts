import type { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';
import { accountSupports7702 } from '../../../../util/transactions/account-supports-7702';
import Engine from '../../Engine';

export const TransactionPayControllerInit: MessengerClientInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      accountSupports7702: (account: string) =>
        accountSupports7702(
          account,
          () => Engine.context.KeyringController,
        ),
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

function getStrategy(_transaction: TransactionMeta): TransactionPayStrategy {
  return TransactionPayStrategy.Relay;
}
