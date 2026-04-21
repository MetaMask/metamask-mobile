import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { MoneyAccountUpgradeControllerMessenger } from '@metamask/money-account-upgrade-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * money account upgrade controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMoneyAccountUpgradeControllerMessenger(
  rootMessenger: RootMessenger,
): MoneyAccountUpgradeControllerMessenger {
  const messenger = new Messenger<
    'MoneyAccountUpgradeController',
    MessengerActions<MoneyAccountUpgradeControllerMessenger>,
    MessengerEvents<MoneyAccountUpgradeControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MoneyAccountUpgradeController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ChompApiService:associateAddress',
      'ChompApiService:getServiceDetails',
      'KeyringController:signPersonalMessage',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type InitActions = KeyringControllerGetStateAction;

type InitEvents = KeyringControllerUnlockEvent;

export type MoneyAccountUpgradeControllerInitMessenger = ReturnType<
  typeof getMoneyAccountUpgradeControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * money account upgrade controller initialization is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The restricted init messenger.
 */
export function getMoneyAccountUpgradeControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'MoneyAccountUpgradeControllerInitialization',
    InitActions,
    InitEvents,
    RootMessenger
  >({
    namespace: 'MoneyAccountUpgradeControllerInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['KeyringController:getState'],
    events: ['KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
