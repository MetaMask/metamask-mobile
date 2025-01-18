import {
  KeyringControllerAccountRemovedEvent,
  KeyringControllerGetAccountsAction,
  KeyringControllerGetKeyringForAccountAction,
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerStateChangeEvent,
} from '@metamask/keyring-controller';
import { SnapControllerStateChangeEvent } from '@metamask/snaps-controllers';

export type MessengerActions =
  | KeyringControllerGetAccountsAction
  | KeyringControllerGetKeyringsByTypeAction
  | KeyringControllerGetKeyringForAccountAction;

export type MessengerEvents =
  | SnapControllerStateChangeEvent
  | KeyringControllerAccountRemovedEvent
  | KeyringControllerStateChangeEvent;
