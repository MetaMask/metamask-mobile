import { MessengerClientInitFunction } from '../types';
import {
  EarnController,
  EarnControllerMessenger,
} from '@metamask/earn-controller';
import { EarnControllerInitMessenger } from '../messengers/earn-controller-messenger';

/**
 * Initialize the earn controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const earnControllerInit: MessengerClientInitFunction<
  EarnController,
  EarnControllerMessenger,
  EarnControllerInitMessenger
> = ({ controllerMessenger, getController }) => {
  const transactionController = getController('TransactionController');

  const controller = new EarnController({
    messenger: controllerMessenger,
    addTransactionFn: transactionController.addTransaction.bind(
      transactionController,
    ),
  });

  controller.init();

  return {
    controller,
  };
};
