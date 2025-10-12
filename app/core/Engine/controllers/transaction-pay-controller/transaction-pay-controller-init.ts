import type { ControllerInitFunction } from '../../types';
import Logger from '../../../../util/Logger';
import {
  TransactionPayController,
  TransactionPayControllerMessenger,
} from '@metamask/transaction-pay-controller';

export const TransactionPayControllerInit: ControllerInitFunction<
  TransactionPayController,
  TransactionPayControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  try {
    const transactionPayController = new TransactionPayController({
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
