import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';
import { MoneyAccountServiceMessenger } from '../../controllers/money-account-service';

/**
 * Get a messenger for the money account service. This is scoped to the
 * actions and events that this service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountServiceMessenger.
 */
export function getMoneyAccountServiceMessenger(
  rootMessenger: RootMessenger,
): MoneyAccountServiceMessenger {
  const messenger = new Messenger<
    'MoneyAccountService',
    MessengerActions<MoneyAccountServiceMessenger>,
    MessengerEvents<MoneyAccountServiceMessenger>,
    RootMessenger
  >({
    namespace: 'MoneyAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:withKeyring',
      'KeyringController:addNewKeyring',
      'KeyringController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type AllowedInitializationEvents = RemoteFeatureFlagControllerStateChangeEvent;
type AllowedInitializationActions = RemoteFeatureFlagControllerGetStateAction;

export type MoneyAccountServiceInitMessenger = ReturnType<
  typeof getMoneyAccountServiceInitMessenger
>;

/**
 * Get a messenger for the money account service during initialization. This is
 * scoped to the actions and events required during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountServiceInitMessenger.
 */
export function getMoneyAccountServiceInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'MoneyAccountServiceInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'MoneyAccountServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });
  return messenger;
}
