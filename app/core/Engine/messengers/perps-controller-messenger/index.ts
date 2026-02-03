import { PerpsControllerMessenger } from '../../../../components/UI/Perps/controllers/PerpsController';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): PerpsControllerMessenger {
  const messenger = new Messenger<
    'PerpsController',
    MessengerActions<PerpsControllerMessenger>,
    MessengerEvents<PerpsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PerpsController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'NetworkController:getState',
      'AuthenticationController:getBearerToken',
      'RemoteFeatureFlagController:getState',
      'AccountsController:getSelectedAccount',
      'KeyringController:signTypedMessage',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'TransactionController:addTransaction',
    ],
    events: [
      'TransactionController:transactionSubmitted',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
      'RemoteFeatureFlagController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
