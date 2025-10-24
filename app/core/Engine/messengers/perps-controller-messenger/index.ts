import { PerpsControllerMessenger } from '../../../../components/UI/Perps/controllers/PerpsController';
import { RootExtendedMessenger } from '../../types';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): PerpsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'PerpsController',
    allowedEvents: [
      'TransactionController:transactionSubmitted',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'RemoteFeatureFlagController:stateChange',
    ],
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getState',
      'AuthenticationController:getBearerToken',
      'RemoteFeatureFlagController:getState',
    ],
  });
}
