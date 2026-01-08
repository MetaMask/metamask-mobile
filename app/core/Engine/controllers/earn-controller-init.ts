import { ControllerInitFunction } from '../types';
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
export const earnControllerInit: ControllerInitFunction<
  EarnController,
  EarnControllerMessenger,
  EarnControllerInitMessenger
> = ({ controllerMessenger, initMessenger, getController }) => {
  const networkState = initMessenger.call('NetworkController:getState');
  const transactionController = getController('TransactionController');

  const controller = new EarnController({
    messenger: controllerMessenger,
    addTransactionFn: transactionController.addTransaction.bind(
      transactionController,
    ),
    selectedNetworkClientId: networkState.selectedNetworkClientId,
  });

  return {
    controller,
  };
};
