///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/* eslint-disable arrow-body-style */
import {
  MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET,
  MULTICHAIN_PROVIDER_CONFIGS,
} from '../../core/Multichain/constants';
import { RootState } from '../../reducers';
import {
  selectChainId,
  selectEvmChainId,
  selectProviderConfig as selectEvmProviderConfig,
} from '../networkController';
import { selectSelectedInternalAccount } from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import {
  MultichainNetworks,
  NETWORK_ASSETS_MAP,
} from '@metamask/assets-controllers';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import {
  selectNonEvmSelected,
  selectSelectedNonEvmNativeCurrency,
  selectSelectedNonEvmNetworkChainId,
} from '../multichainNetworkController';

/**
 * Get the state of the `bitcoinSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinSupportEnabled` flag.
 */
export function selectIsBitcoinSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinSupportEnabled;
}

/**
 * Get the state of the `bitcoinTestnetSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinTestnetSupportEnabled` flag.
 */
export function selectIsBitcoinTestnetSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinTestnetSupportEnabled;
}

/**
 * Get the state of the `solanaSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `solanaSupportEnabled` flag.
 */
export function selectIsSolanaSupportEnabled(state: RootState) {
  return state.multichainSettings.solanaSupportEnabled;
}

export const selectMultichainDefaultToken = createDeepEqualSelector(
  selectNonEvmSelected,
  selectEvmProviderConfig,
  selectSelectedNonEvmNativeCurrency,
  (isNonEvmSelected, evmProviderConfig, nonEvmTicker) => {
    const symbol = !isNonEvmSelected ? evmProviderConfig.ticker : nonEvmTicker;
    return { symbol };
  },
);

export const selectMultichainIsBitcoin = createDeepEqualSelector(
  selectNonEvmSelected,
  selectMultichainDefaultToken,
  (isNonEvmSelected, token) =>
    isNonEvmSelected &&
    token.symbol ===
      MULTICHAIN_PROVIDER_CONFIGS[MultichainNetworks.Bitcoin].ticker,
);

export const selectMultichainIsMainnet = createDeepEqualSelector(
  selectNonEvmSelected,
  selectSelectedInternalAccount,
  selectEvmChainId,
  selectChainId,
  (isNonEvmSelected, selectedAccount, evmChainId, chainId) => {
    if (!isNonEvmSelected) {
      return isMainNet(evmChainId);
    }

    if (!selectedAccount) {
      return false;
    }

    const mainnet = (
      MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
    )[selectedAccount.type];
    return chainId === mainnet;
  },
);

/**
 *
 * @param state - Root redux state
 * @returns - MultichainBalancesController state
 */
const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

export const selectMultichainBalances = createDeepEqualSelector(
  selectMultichainBalancesControllerState,
  (multichainBalancesControllerState) =>
    multichainBalancesControllerState.balances,
);

export const selectMultichainShouldShowFiat = createDeepEqualSelector(
  selectMultichainIsMainnet,
  selectNonEvmSelected,
  selectShowFiatInTestnets,
  (multichainIsMainnet, isNonEvmSelected, shouldShowFiatOnTestnets) => {
    const isTestnet = !multichainIsMainnet;
    if (!isNonEvmSelected) {
      return isTestnet ? shouldShowFiatOnTestnets : true; // Is it safe to assume that we default show fiat for mainnet?
    }
    return (
      multichainIsMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets))
    );
  },
);

const selectNonEvmCachedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectSelectedNonEvmNetworkChainId,
  (selectedInternalAccount, multichainBalances, nonEvmChainId) => {
    if (!selectedInternalAccount) {
      return undefined;
    }
    // We assume that there's at least one asset type in and that is the native
    // token for that network.
    const asset = NETWORK_ASSETS_MAP[nonEvmChainId]?.[0];
    const balancesForAccount = multichainBalances?.[selectedInternalAccount.id];
    const balanceOfAsset = balancesForAccount?.[asset];
    return balanceOfAsset?.amount ?? 0;
  },
);

export const selectMultichainSelectedAccountCachedBalance =
  createDeepEqualSelector(
    selectNonEvmSelected,
    selectAccountBalanceByChainId,
    selectNonEvmCachedBalance,
    (isNonEvmSelected, accountBalanceByChainId, nonEvmCachedBalance) =>
      !isNonEvmSelected
        ? accountBalanceByChainId?.balance ?? '0x0'
        : nonEvmCachedBalance,
  );

export function selectMultichainCoinRates(state: RootState) {
  return state.engine.backgroundState.RatesController.rates;
}

export const selectMultichainConversionRate = createDeepEqualSelector(
  selectNonEvmSelected,
  selectConversionRate,
  selectMultichainCoinRates,
  selectSelectedNonEvmNativeCurrency,
  (isNonEvmSelected, evmConversionRate, multichaincCoinRates, nonEvmTicker) => {
    if (!isNonEvmSelected) {
      return evmConversionRate;
    }

    return nonEvmTicker
      ? multichaincCoinRates?.[nonEvmTicker.toLowerCase()]?.conversionRate
      : undefined;
  },
);
///: END:ONLY_INCLUDE_IF
