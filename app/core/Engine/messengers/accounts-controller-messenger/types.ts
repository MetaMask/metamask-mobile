import {
  KeyringControllerAccountRemovedEvent,
  KeyringControllerGetAccountsAction,
  KeyringControllerGetKeyringForAccountAction,
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import { SnapControllerStateChangeEvent } from '@metamask/snaps-controllers';

/**
 * The actions that the AccountsControllerMessenger can use.
 */
export type MessengerActions =
  | KeyringControllerGetAccountsAction
  | KeyringControllerGetKeyringsByTypeAction
  | KeyringControllerGetKeyringForAccountAction;

/**
 * The events that the AccountsControllerMessenger can handle.
 */
export type MessengerEvents =
  | SnapControllerStateChangeEvent
  | KeyringControllerAccountRemovedEvent
  | KeyringControllerStateChangeEvent;
