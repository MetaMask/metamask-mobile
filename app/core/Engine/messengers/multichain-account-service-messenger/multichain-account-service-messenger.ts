import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import {
  MultichainAccountServiceMessenger,
  MultichainAccountServiceMultichainAccountGroupUpdatedEvent,
} from '@metamask/multichain-account-service';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the multichain account service. This is scoped to the
 * actions and events that this service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainAccountServiceMessenger.
 */
export function getMultichainAccountServiceMessenger(
  rootMessenger: RootMessenger,
): MultichainAccountServiceMessenger {
  const messenger = new Messenger<
    'MultichainAccountService',
    MessengerActions<MultichainAccountServiceMessenger>,
    MessengerEvents<MultichainAccountServiceMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccountByAddress',
      'AccountsController:getAccount',
      'AccountsController:getAccounts',
      'KeyringController:getState',
      'KeyringController:withKeyring',
      'KeyringController:withKeyringV2',
      'KeyringController:addNewKeyring',
      'KeyringController:getKeyringsByType',
      'KeyringController:createNewVaultAndKeychain',
      'KeyringController:createNewVaultAndRestore',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'SnapController:handleRequest',
      'SnapAccountService:ensureReady',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationEvents =
  MultichainAccountServiceMultichainAccountGroupUpdatedEvent;

type AllowedInitializationActions = never;

export type MultichainAccountServiceInitMessenger = ReturnType<
  typeof getMultichainAccountServiceInitMessenger
>;

/**
 * Get a messenger for the multichain account service during initialization. This is scoped to the
 * actions and events that the MultichainAccountService requires during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainAccountServiceInitMessenger.
 */
export function getMultichainAccountServiceInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'MultichainAccountServiceInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'MultichainAccountServiceInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['MultichainAccountService:multichainAccountGroupUpdated'],
    messenger,
  });
  return messenger;
}
