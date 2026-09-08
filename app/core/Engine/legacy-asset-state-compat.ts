import { Messenger } from '@metamask/messenger';
import type {
  AccountTrackerControllerGetStateAction,
  CurrencyRateControllerGetStateAction,
  TokenBalancesControllerGetStateAction,
  TokenRatesControllerGetStateAction,
  TokensControllerGetStateAction,
  MultichainAssetsControllerGetStateAction,
} from '@metamask/assets-controllers';
import { store } from '../../store';
import {
  getAccountTrackerControllerAccountsByChainId,
  getCurrencyRateControllerCurrentCurrency,
  getCurrencyRateControllerCurrencyRates,
  getTokenBalancesControllerTokenBalances,
  getTokenRatesControllerMarketData,
  getTokensControllerAllTokens,
  getTokensControllerAllIgnoredTokens,
  getMultiChainAssetsControllerAccountsAssets,
  getMultiChainAssetsControllerAssetsMetadata,
  getMultiChainAssetsControllerAllIgnoredAssets,
} from '../../selectors/assets/assets-migration';
import { RootExtendedMessenger, RootMessenger } from './types';

/**
 * `AccountTrackerController`, `CurrencyRateController`, `TokenBalancesController`,
 * `TokenRatesController`, `TokensController`, and `MultichainAssetsController`
 * are no longer constructed by the Engine — `AssetsController` is the sole
 * source of truth for asset data.
 *
 * A handful of external controllers (`TransactionPayController`,
 * `TokenSearchDiscoveryDataController`, `BridgeController`,
 * `SnapInterfaceController`) still declare `:getState` actions for these
 * controllers in their messenger's allowed-actions union, so this registers
 * lightweight compatibility handlers — each on its own namespaced child
 * messenger, as required by `registerActionHandler` — that derive the same
 * legacy state shape from `AssetsController` via the shims in
 * `selectors/assets/assets-migration.ts`. This keeps those controllers
 * functional without reintroducing the legacy controllers themselves.
 */
export function registerLegacyAssetControllerStateCompat(
  rootMessenger: RootExtendedMessenger,
) {
  new Messenger<
    'AccountTrackerController',
    AccountTrackerControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'AccountTrackerController',
    parent: rootMessenger,
  }).registerActionHandler('AccountTrackerController:getState', () => ({
    accountsByChainId: getAccountTrackerControllerAccountsByChainId(
      store.getState(),
    ),
  }));

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

  new Messenger<
    'TokenBalancesController',
    TokenBalancesControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'TokenBalancesController',
    parent: rootMessenger,
  }).registerActionHandler('TokenBalancesController:getState', () => ({
    tokenBalances: getTokenBalancesControllerTokenBalances(store.getState()),
  }));

  new Messenger<
    'TokenRatesController',
    TokenRatesControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'TokenRatesController',
    parent: rootMessenger,
  }).registerActionHandler('TokenRatesController:getState', () => ({
    marketData: getTokenRatesControllerMarketData(store.getState()),
  }));

  new Messenger<
    'TokensController',
    TokensControllerGetStateAction,
    never,
    RootMessenger
  >({
    namespace: 'TokensController',
    parent: rootMessenger,
  }).registerActionHandler('TokensController:getState', () => ({
    allTokens: getTokensControllerAllTokens(store.getState()),
    allIgnoredTokens: getTokensControllerAllIgnoredTokens(store.getState()),
    allDetectedTokens: {},
  }));

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
