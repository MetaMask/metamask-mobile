import type { MessengerClientInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
} from '@metamask/transaction-pay-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';
import { getDelegationTransaction } from '../../../../util/transactions/delegation';

export const TransactionPayControllerInit: MessengerClientInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger,
  TransactionPayControllerInitMessenger
> = (request) => {
  const { controllerMessenger, initMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
      // The pay controller depends on a newer minor of `@metamask/transaction-controller`
      // than mobile's direct dependency, so the `TransactionMeta` shapes diverge
      // structurally (e.g. extra `TransactionType` enum members in the newer version).
      // Mobile's `getDelegationTransaction` util only reads a subset of fields that
      // is identical across both versions, so casting at this boundary is safe.
      getDelegationTransaction: ({ transaction }) =>
        getDelegationTransaction(
          initMessenger,
          transaction as unknown as TransactionMeta,
        ),
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
