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
      'AccountsController:selectedAccountChange',
      'NetworkController:stateChange',
      'KeyringController:lock',
      'KeyringController:unlock',
    ],
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'KeyringController:signTypedMessage',
    ],
  });
}
