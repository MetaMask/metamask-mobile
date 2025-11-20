import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { EarnControllerMessenger } from '@metamask/earn-controller';
import { NetworkControllerGetStateAction } from '@metamask/network-controller';
import { RootMessenger } from '../types';

/**
 * Get a messenger restricted to the actions and events that the
 * earn controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getEarnControllerMessenger(
  rootMessenger: RootMessenger,
): EarnControllerMessenger {
  const messenger = new Messenger<
    'EarnController',
    MessengerActions<EarnControllerMessenger>,
    MessengerEvents<EarnControllerMessenger>,
    RootMessenger
  >({
    namespace: 'EarnController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
    ],
    events: [
      'AccountTreeController:selectedAccountGroupChange',
      'TransactionController:transactionConfirmed',
      'NetworkController:networkDidChange',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions = NetworkControllerGetStateAction;

export type EarnControllerInitMessenger = ReturnType<
  typeof getEarnControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * earn controller initialization is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getEarnControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'EarnControllerInitialization',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'EarnControllerInitialization',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['NetworkController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
