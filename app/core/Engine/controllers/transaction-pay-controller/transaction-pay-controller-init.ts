import type { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

export const TransactionPayControllerInit: ControllerInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
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

async function getStrategy(
  transaction: TransactionMeta,
): Promise<TransactionPayStrategy> {
  return transaction.type === TransactionType.perpsDeposit
    ? TransactionPayStrategy.Relay
    : TransactionPayStrategy.Bridge;
}
