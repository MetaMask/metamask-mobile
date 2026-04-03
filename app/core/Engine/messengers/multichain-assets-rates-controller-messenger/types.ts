import {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import {
  CurrencyRateStateChange,
  GetCurrencyRateState,
  MultichainAssetsControllerGetStateAction,
  MultichainAssetsControllerAccountAssetListUpdatedEvent,
} from '@metamask/assets-controllers';
import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerListMultichainAccountsAction,
} from '@metamask/accounts-controller';
import { SnapControllerHandleRequestAction } from '@metamask/snaps-controllers';

export type MultichainAssetsRatesControllerMessengerActions =
  | SnapControllerHandleRequestAction
  | AccountsControllerListMultichainAccountsAction
  | GetCurrencyRateState
  | MultichainAssetsControllerGetStateAction;

export type MultichainAssetsRatesControllerMessengerEvents =
  | KeyringControllerLockEvent
  | KeyringControllerUnlockEvent
  | AccountsControllerAccountAddedEvent
  | CurrencyRateStateChange
  | MultichainAssetsControllerAccountAssetListUpdatedEvent;
