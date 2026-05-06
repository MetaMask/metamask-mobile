import {
  KeyringControllerAccountRemovedEvent,
  KeyringControllerGetAccountsAction,
  KeyringControllerGetKeyringForAccountAction,
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';

/**
 * The actions that the AccountsControllerMessenger can use.
 */
export type AccountsControllerMessengerActions =
  | KeyringControllerGetAccountsAction
  | KeyringControllerGetKeyringsByTypeAction
  | KeyringControllerGetKeyringForAccountAction;

/**
 * The events that the AccountsControllerMessenger can handle.
 */
export type AccountsControllerMessengerEvents =
  | KeyringControllerAccountRemovedEvent
  | KeyringControllerStateChangeEvent;
