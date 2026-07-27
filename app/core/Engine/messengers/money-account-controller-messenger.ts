import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { MoneyAccountControllerMessenger } from '@metamask/money-account-controller';
import {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerState,
} from '@metamask/remote-feature-flag-controller';
import { KeyringControllerGetStateAction } from '@metamask/keyring-controller';
import { ControllerStateChangeEvent } from '@metamask/base-controller';
import { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMoneyAccountControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountControllerMessenger>,
    MessengerEvents<MoneyAccountControllerMessenger>
  >,
): MoneyAccountControllerMessenger {
  const messenger: MoneyAccountControllerMessenger = new Messenger({
    namespace: 'MoneyAccountController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      'KeyringController:getState',
      'KeyringController:addNewKeyring',
      'KeyringController:withKeyring',
    ],
    events: [],
  });

  return messenger;
}

type AllowedInitializationActions =
  | RemoteFeatureFlagControllerGetStateAction
  | KeyringControllerGetStateAction;

type AllowedInitializationEvents = ControllerStateChangeEvent<
  'RemoteFeatureFlagController',
  RemoteFeatureFlagControllerState
>;

export type MoneyAccountControllerInitMessenger = Messenger<
  'MoneyAccountControllerInit',
  AllowedInitializationActions,
  AllowedInitializationEvents
>;

/**
 * Get the messenger for the money account controller initialization. This is
 * scoped to the actions and events needed during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MoneyAccountControllerInitMessenger.
 */
export function getMoneyAccountControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MoneyAccountControllerInitMessenger>,
    MessengerEvents<MoneyAccountControllerInitMessenger>
  >,
): MoneyAccountControllerInitMessenger {
  const messenger: MoneyAccountControllerInitMessenger = new Messenger({
    namespace: 'MoneyAccountControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'KeyringController:getState',
    ],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });

  return messenger;
}
