import { PredictControllerMessenger } from '../../../../components/UI/Predict/controllers/PredictController';
import { RootExtendedMessenger } from '../../types';

/**
 * Get the PredictControllerMessenger for the PredictController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The PredictControllerMessenger.
 */
export function getPredictControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): PredictControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'PredictController',
    allowedEvents: [
      'TransactionController:transactionSubmitted',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'TransactionController:transactionRejected',
    ],
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getState',
    ],
  });
}
