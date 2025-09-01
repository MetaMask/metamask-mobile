import {
  AccountsControllerGetSelectedMultichainAccountAction,
  AccountsControllerSelectedAccountChangeEvent,
} from '@metamask/accounts-controller';
import {
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { RewardsDataServiceLoginAction } from '../../controllers/rewards-controller/services/rewards-data-service';
import type { ControllerGetStateAction } from '@metamask/base-controller';
import type { RewardsControllerState } from '../../controllers/rewards-controller/types';

/**
 * Types for the RewardsController messenger
 */

/**
 * Actions that the RewardsController messenger can handle
 */
export type RewardsControllerMessengerActions =
  | AccountsControllerGetSelectedMultichainAccountAction
  | KeyringControllerSignPersonalMessageAction
  | RewardsDataServiceLoginAction
  | ControllerGetStateAction<'RewardsController', RewardsControllerState>;

/**
 * Events that the RewardsController messenger can emit
 */
export type RewardsControllerMessengerEvents =
  | AccountsControllerSelectedAccountChangeEvent
  | KeyringControllerUnlockEvent;
