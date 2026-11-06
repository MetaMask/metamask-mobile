import { PerpsControllerMessenger } from '@metamask/perps-controller';
import type { GeolocationControllerStateChangeEvent } from '@metamask/geolocation-controller';
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
 * AuthenticationController, AuthenticatedUserStorageService,
 * SubscriptionController.
 * The root messenger already registers actions for these controllers,
 * so the child messenger can call them through the parent.
 *
 * `SubscriptionController:getBenefits` is what lets the perps fee resolver
 * hydrate the Money Account Plus benefits snapshot; without it every order
 * resolves as having no subscription source and pays the default builder fee.
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
      'KeyringController:signPersonalMessage',
      'TransactionController:addTransaction',
      'RemoteFeatureFlagController:getState',
      'AccountsController:getSelectedAccount',
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'AuthenticationController:getBearerToken',
      'AuthenticatedUserStorageService:getNotificationPreferences',
      'AuthenticatedUserStorageService:putNotificationPreferences',
      'SubscriptionController:getBenefits',
    ],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'AccountsController:selectedAccountChange',
      'AccountTreeController:selectedAccountGroupChange',
    ],
  });
  return messenger;
}

type AllowedInitializationEvents = GeolocationControllerStateChangeEvent;

export type PerpsControllerInitMessenger = Messenger<
  'PerpsControllerInit',
  never,
  AllowedInitializationEvents
>;

/**
 * Get the messenger for the PerpsController initialization. This is scoped to
 * the events the client wires up around the controller.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PerpsControllerInitMessenger.
 */
export function getPerpsControllerInitMessenger(
  rootMessenger: RootMessenger<never, AllowedInitializationEvents>,
): PerpsControllerInitMessenger {
  const messenger: PerpsControllerInitMessenger = new Messenger({
    namespace: 'PerpsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    events: ['GeolocationController:stateChange'],
    messenger,
  });

  return messenger;
}
