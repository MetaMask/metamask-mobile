import { PerpsControllerMessenger } from '@metamask/perps-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  type ActionConstraint,
  type EventConstraint,
} from '@metamask/messenger';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * PerpsController uses the messenger for all cross-controller communication:
 * NetworkController, KeyringController, TransactionController,
 * RemoteFeatureFlagController, AccountsController, AccountTreeController,
 * AuthenticationController.
 * The root messenger already registers actions for these controllers,
 * so the child messenger can call them through the parent.
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
  // Widen `messenger` to a generic `Messenger<...>` for the delegate call only.
  // `delegate`'s constraint is `DelegatedActions extends (MessengerActions<Delegatee> & Action)['type'][]`,
  // which performs an intersection between the delegatee's action union and the
  // root messenger's action union. With many actions on each side, this hits
  // TypeScript's union-type-complexity ceiling (TS2590). Erasing the delegatee's
  // specific action union to the open `ActionConstraint` short-circuits the
  // intersection without affecting the runtime behavior — `delegate` only
  // inspects the action/event name strings at runtime.
  rootExtendedMessenger.delegate({
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
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'AccountsController:selectedAccountChange',
      'AccountTreeController:selectedAccountGroupChange',
    ],
  });
  return messenger;
}
