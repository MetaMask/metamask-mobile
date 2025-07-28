import { TransactionController } from '@metamask/transaction-controller';
import type { ControllerInitFunction } from '../../types';
import {
  EarnController,
  type EarnControllerMessenger,
  getDefaultEarnControllerState,
} from '@metamask/earn-controller';

/**
 * Initialize the EarnController.
 *
 * @param request - The request object.
 * @returns The EarnController.
 */
export const earnControllerInit: ControllerInitFunction<
  EarnController,
  EarnControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const earnControllerState =
    persistedState.EarnController ?? getDefaultEarnControllerState();

  const controller = new EarnController({
    messenger: controllerMessenger,
    state: earnControllerState,
    // TODO: this init method is not currently used, when it is, we need to pass in the addTransactionFn
    // from an intiialized TransactionController
    addTransactionFn: TransactionController.prototype.addTransaction,
  });

  return { controller };
};
