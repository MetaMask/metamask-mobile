import {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import {
  MultichainAssetsControllerStateChangeEvent,
  CurrencyRateStateChange,
  GetCurrencyRateState,
  MultichainAssetsControllerGetStateAction,
} from '@metamask/assets-controllers';
import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import { HandleSnapRequest } from '@metamask/snaps-controllers';

export type MultichainAssetsRatesControllerMessengerActions =
  | HandleSnapRequest
  | AccountsControllerListMultichainAccountsAction
  | GetCurrencyRateState
  | MultichainAssetsControllerGetStateAction;

export type MultichainAssetsRatesControllerMessengerEvents =
  | KeyringControllerLockEvent
  | KeyringControllerUnlockEvent
  | AccountsControllerAccountAddedEvent
  | CurrencyRateStateChange
  | MultichainAssetsControllerStateChangeEvent;
