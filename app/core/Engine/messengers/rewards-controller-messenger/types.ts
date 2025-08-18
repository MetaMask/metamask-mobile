import {
  AccountsControllerGetSelectedMultichainAccountAction,
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
  | AccountsControllerGetSelectedMultichainAccountAction
  | KeyringControllerSignPersonalMessageAction;

/**
 * RewardsController specific events
 */
export interface RewardsControllerAccountOptInEvent {
  type: 'RewardsController:accountOptIn';
  payload: [string]; // account address
}

/**
 * Events that the RewardsController messenger can emit
 */
export type RewardsControllerMessengerEvents =
  | AccountsControllerSelectedAccountChangeEvent
  | KeyringControllerUnlockEvent
  | RewardsControllerAccountOptInEvent;
