import { PerpsControllerMessenger } from '@metamask/perps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  type ActionConstraint,
  type EventConstraint,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<PerpsControllerMessenger>;

type AllowedEvents = MessengerEvents<PerpsControllerMessenger>;

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * PerpsController uses the messenger for all cross-controller communication:
 * NetworkController, KeyringController, TransactionController,
 * RemoteFeatureFlagController, AccountsController, AccountTreeController,
 * AuthenticationController, AuthenticatedUserStorageService.
 * The root messenger already registers actions for these controllers,
 * so the child messenger can call them through the parent.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): PerpsControllerMessenger {
  const messenger: PerpsControllerMessenger = new Messenger({
    namespace: 'PerpsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: messenger as Messenger<
      'PerpsController',
      ActionConstraint,
      EventConstraint,
      RootMessenger
    >,
    actions: [
      'GeolocationController:getGeolocation',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'KeyringController:getState',
      'KeyringController:signTypedMessage',
      'TransactionController:addTransaction',
      'RemoteFeatureFlagController:getState',
      'AccountsController:getSelectedAccount',
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'AuthenticationController:getBearerToken',
      'AuthenticatedUserStorageService:getNotificationPreferences',
      'AuthenticatedUserStorageService:putNotificationPreferences',
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'AccountsController:selectedAccountChange',
      'AccountTreeController:selectedAccountGroupChange',
    ],
  });
  return messenger;
}
