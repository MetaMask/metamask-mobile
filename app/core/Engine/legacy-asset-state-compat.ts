import { Messenger } from '@metamask/messenger';
import type {
  CurrencyRateControllerGetStateAction,
  MultichainAssetsControllerGetStateAction,
} from '@metamask/assets-controllers';
import { store } from '../../store';
import {
  getCurrencyRateControllerCurrentCurrency,
  getCurrencyRateControllerCurrencyRates,
  getMultiChainAssetsControllerAccountsAssets,
  getMultiChainAssetsControllerAssetsMetadata,
  getMultiChainAssetsControllerAllIgnoredAssets,
} from '../../selectors/assets/assets-migration';
import { RootExtendedMessenger, RootMessenger } from './types';

/**
 * The legacy asset controllers are no longer built by the Engine, but some
 * packages still call their `:getState` actions. These handlers answer those
 * calls with the legacy state shape, derived from `AssetsController`.
 *
 * Only these two have a runtime caller (checked against the installed packages):
 * - `CurrencyRateController:getState`
 * - `MultichainAssetsController:getState`
 *
 * Remove this file once those consumers read from `AssetsController` directly.
 */
export function registerLegacyAssetControllerStateCompat(
  rootMessenger: RootExtendedMessenger,
) {
  // Used by `@metamask/bridge-controller` (quotes), `TokenSearchDiscoveryDataController`
  // (`@metamask/assets-controllers`) and the `snap_getPreferences` handler in this repo.
  new Messenger<
    'CurrencyRateController',
    CurrencyRateControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'CurrencyRateController',
    parent: rootMessenger,
  }).registerActionHandler('CurrencyRateController:getState', () => ({
    currentCurrency: getCurrencyRateControllerCurrentCurrency(store.getState()),
    currencyRates: getCurrencyRateControllerCurrencyRates(store.getState()),
  }));

  // Used by `SnapInterfaceController` (`@metamask/snaps-controllers`).
  new Messenger<
    'MultichainAssetsController',
    MultichainAssetsControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'MultichainAssetsController',
    parent: rootMessenger,
  }).registerActionHandler('MultichainAssetsController:getState', () => ({
    accountsAssets: getMultiChainAssetsControllerAccountsAssets(
      store.getState(),
    ),
    assetsMetadata: getMultiChainAssetsControllerAssetsMetadata(
      store.getState(),
    ),
    allIgnoredAssets: getMultiChainAssetsControllerAllIgnoredAssets(
      store.getState(),
    ),
  }));
}
