import { PerpsControllerMessenger } from '../../../../components/UI/Perps/controllers/PerpsController';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): PerpsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'PerpsController',
    allowedEvents: [
      'TransactionController:transactionSubmitted',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
    ],
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getState',
      'AuthenticationController:getBearerToken',
    ],
  });
}
