import { Messenger } from '@metamask/base-controller';
import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerGetAccountAction,
  AccountsControllerGetAccountByAddressAction,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import { HandleSnapRequest as SnapControllerHandleRequest } from '@metamask/snaps-controllers';
import {
  KeyringControllerWithKeyringAction,
  KeyringControllerGetStateAction,
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerAddNewKeyringAction,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { MultichainAccountServiceMultichainAccountGroupUpdatedEvent } from '@metamask/multichain-account-service';

type Actions =
  | AccountsControllerListMultichainAccountsAction
  | AccountsControllerGetAccountAction
  | AccountsControllerGetAccountByAddressAction
  | SnapControllerHandleRequest
  | KeyringControllerGetStateAction
  | KeyringControllerWithKeyringAction
  | KeyringControllerAddNewKeyringAction
  | KeyringControllerGetKeyringsByTypeAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | RemoteFeatureFlagControllerGetStateAction;

type Events =
  | KeyringControllerStateChangeEvent
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | { type: 'RemoteFeatureFlagController:stateChange'; payload: [unknown] };

export type MultichainAccountServiceMessenger = ReturnType<
  typeof getMultichainAccountServiceMessenger
>;

/**
 * Get a restricted messenger for the multichain account service. This is scoped to the
 * actions and events that this service is allowed to handle.
 *
 * @param messenger - The service messenger to restrict.
 * @returns The restricted service messenger.
 */
export function getMultichainAccountServiceMessenger(
  messenger: Messenger<Actions, Events>,
) {
  return messenger.getRestricted({
    name: 'MultichainAccountService',
    allowedEvents: [
      'KeyringController:stateChange',
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'RemoteFeatureFlagController:stateChange',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccountByAddress',
      'AccountsController:getAccount',
      'SnapController:handleRequest',
      'KeyringController:getState',
      'KeyringController:withKeyring',
      'KeyringController:addNewKeyring',
      'KeyringController:getKeyringsByType',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'RemoteFeatureFlagController:getState',
    ],
  });
}

export type AllowedInitializationEvents =
  MultichainAccountServiceMultichainAccountGroupUpdatedEvent;

export type MultichainAccountServiceInitMessenger = ReturnType<
  typeof getMultichainAccountServiceInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * MultichainAccountService requires during initialization.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMultichainAccountServiceInitMessenger(
  messenger: Messenger<never, AllowedInitializationEvents>,
) {
  return messenger.getRestricted({
    name: 'MultichainAccountServiceInit',
    allowedActions: [],
    allowedEvents: ['MultichainAccountService:multichainAccountGroupUpdated'],
  });
}
