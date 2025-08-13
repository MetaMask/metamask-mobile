import {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
} from '@metamask/accounts-controller';
import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';

/**
 * Types for the RewardsController messenger
 */

/**
 * Actions that the RewardsController messenger can handle
 */
export type RewardsControllerMessengerActions =
  | AccountsControllerGetSelectedAccountAction
  | KeyringControllerSignPersonalMessageAction;

/**
 * Events that the RewardsController messenger can emit
 */
export type RewardsControllerMessengerEvents =
  | AccountsControllerSelectedAccountChangeEvent
  | KeyringControllerUnlockEvent;
