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
 * Serves `:getState` for the legacy controllers that some packages still call,
 * using `AssetsController` data. Remove once those packages stop calling them.
 */
export function registerLegacyAssetControllerStateCompat(
  rootMessenger: RootExtendedMessenger,
) {
  // Used by `TokenSearchDiscoveryDataController` (`@metamask/assets-controllers`),
  // e.g. `fetchTokenDisplayData` called from `useEarnToken`.
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
