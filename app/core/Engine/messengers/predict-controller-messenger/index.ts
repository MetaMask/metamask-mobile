import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { PredictControllerMessenger } from '../../../../components/UI/Predict/controllers/PredictController';
import { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the PredictControllerMessenger for the PredictController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The PredictControllerMessenger.
 */
export function getPredictControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): PredictControllerMessenger {
  const messenger = new Messenger<
    'PredictController',
    MessengerActions<PredictControllerMessenger>,
    MessengerEvents<PredictControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PredictController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getState',
      'TransactionController:estimateGas',
    ],
    events: [
      'TransactionController:transactionSubmitted',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'TransactionController:transactionRejected',
    ],
    messenger,
  });
  return messenger;
}
