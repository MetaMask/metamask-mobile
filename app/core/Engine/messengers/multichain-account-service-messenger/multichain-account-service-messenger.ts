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
  rootMessenger: RootMessenger<
    MessengerActions<MultichainAccountServiceMessenger>,
    MessengerEvents<MultichainAccountServiceMessenger>
  >,
): MultichainAccountServiceMessenger {
  const messenger: MultichainAccountServiceMessenger = new Messenger({
    namespace: 'MultichainAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccountByAddress',
      'AccountsController:getAccount',
      'AccountsController:getAccounts',
      'SnapController:handleRequest',
      'KeyringController:getState',
      'KeyringController:withKeyring',
      'KeyringController:addNewKeyring',
      'KeyringController:getKeyringsByType',
      'KeyringController:createNewVaultAndKeychain',
      'KeyringController:createNewVaultAndRestore',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'SnapController:getState',
    ],
    events: [
      'KeyringController:stateChange',
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'SnapController:stateChange',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationEvents =
  MultichainAccountServiceMultichainAccountGroupUpdatedEvent;

export type MultichainAccountServiceInitMessenger = Messenger<
  'MultichainAccountServiceInit',
  never,
  AllowedInitializationEvents
>;

/**
 * Get a messenger for the multichain account service during initialization. This is scoped to the
 * actions and events that the MultichainAccountService requires during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainAccountServiceInitMessenger.
 */
export function getMultichainAccountServiceInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainAccountServiceInitMessenger>,
    MessengerEvents<MultichainAccountServiceInitMessenger>
  >,
): MultichainAccountServiceInitMessenger {
  const messenger: MultichainAccountServiceInitMessenger = new Messenger({
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
