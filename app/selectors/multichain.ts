import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { Token, getNativeTokenAddress } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectSelectedInternalAccountFormattedAddress,
  selectSelectedInternalAccount,
} from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectAccountsByChainId } from './accountTrackerController';
import {
  selectChainId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectTicker,
} from './networkController';
import { TokenI } from '../components/UI/Tokens/types';
import { renderFromWei, weiToFiat } from '../util/number';
import { hexToBN, toHex } from '@metamask/controller-utils';
import {
  selectConversionRate,
  selectCurrencyRates,
  selectCurrentCurrency,
} from './currencyRateController';
import {
  isBtcTestnetAddress,
  isBtcMainnetAddress,
} from '../core/Multichain/utils';
import { isMainNet, isTestNet } from '../util/networks';
import { isEvmAccountType } from '@metamask/keyring-api';

interface NativeTokenBalance {
  balance: string;
  stakedBalance: string;
  isStaked: boolean;
  name: string;
}

type ChainBalances = Record<string, NativeTokenBalance>;

/**
 * Get the cached native token balance for the selected account by chainId.
 *
 * @param {RootState} state - The root state.
 * @returns {ChainBalances} The cached native token balance for the selected account by chainId.
 */
export const selectedAccountNativeTokenCachedBalanceByChainId = createSelector(
  [selectSelectedInternalAccountFormattedAddress, selectAccountsByChainId],
  (selectedAddress, accountsByChainId): ChainBalances => {
    if (!selectedAddress || !accountsByChainId) {
      return {};
    }

    const result: ChainBalances = {};
    for (const chainId in accountsByChainId) {
      const accounts = accountsByChainId[chainId];
      const account = accounts[selectedAddress];
      if (account) {
        result[chainId] = {
          balance: account.balance,
          stakedBalance: account.stakedBalance ?? '0x0',
          isStaked: account.stakedBalance !== '0x0',
          name: '',
        };
      }
    }

    return result;
  },
);

/**
 * Selector to get native tokens for the selected account across all chains.
 */
export const selectNativeTokensAcrossChains = createSelector(
  [
    selectNetworkConfigurations,
    selectedAccountNativeTokenCachedBalanceByChainId,
    selectCurrencyRates,
    selectCurrentCurrency,
  ],
  (
    networkConfigurations,
    nativeTokenBalancesByChainId,
    currencyRates,
    currentCurrency,
  ) => {
    const tokensByChain: { [chainId: string]: TokenI[] } = {};
    for (const token of Object.values(networkConfigurations)) {
      const nativeChainId = token.chainId as Hex;
      const nativeTokenInfoByChainId =
        nativeTokenBalancesByChainId[nativeChainId];
      const isETH = ['ETH', 'GOETH', 'SepoliaETH', 'LineaETH'].includes(
        token.nativeCurrency || '',
      );

      const name = isETH ? 'Ethereum' : token.nativeCurrency;
      const logo = isETH ? '../images/eth-logo-new.png' : '';
      tokensByChain[nativeChainId] = [];

      const nativeBalanceFormatted = renderFromWei(
        nativeTokenInfoByChainId?.balance,
      );
      const stakedBalanceFormatted = renderFromWei(
        nativeTokenInfoByChainId?.stakedBalance,
      );

      let balanceFiat = '';
      let stakedBalanceFiat = '';

      const conversionRate =
        currencyRates?.[token.nativeCurrency]?.conversionRate ?? 0;

      balanceFiat = weiToFiat(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hexToBN(nativeTokenInfoByChainId?.balance) as any,
        conversionRate,
        currentCurrency,
      );
      stakedBalanceFiat = weiToFiat(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hexToBN(nativeTokenInfoByChainId?.stakedBalance) as any,
        conversionRate,
        currentCurrency,
      );

      const tokenByChain = {
        ...nativeTokenInfoByChainId,
        name,
        address: getNativeTokenAddress(nativeChainId),
        balance: nativeBalanceFormatted,
        chainId: nativeChainId,
        isNative: true,
        aggregators: [],
        balanceFiat,
        image: '',
        logo,
        isETH,
        decimals: 18,
        symbol: name,
        isStaked: false,
        ticker: token.nativeCurrency,
      };

      // Non-staked tokens
      tokensByChain[nativeChainId].push(tokenByChain);

      if (
        nativeTokenInfoByChainId &&
        nativeTokenInfoByChainId.isStaked &&
        nativeTokenInfoByChainId.stakedBalance !== '0x00' &&
        nativeTokenInfoByChainId.stakedBalance !== toHex(0)
      ) {
        // Staked tokens
        tokensByChain[nativeChainId].push({
          ...nativeTokenInfoByChainId,
          nativeAsset: tokenByChain,
          chainId: nativeChainId,
          address: getNativeTokenAddress(nativeChainId),
          balance: stakedBalanceFormatted,
          balanceFiat: stakedBalanceFiat,
          isNative: true,
          aggregators: [],
          image: '',
          logo,
          isETH,
          decimals: 18,
          name: 'Staked Ethereum',
          symbol: name,
          isStaked: true,
          ticker: token.nativeCurrency,
        });
      }
    }

    return tokensByChain;
  },
);

/**
 * Get the tokens for the selected account across all chains.
 *
 * @param {RootState} state - The root state.
 * @returns {TokensByChain} The tokens for the selected account across all chains.
 */
export const selectAccountTokensAcrossChains = createSelector(
  [
    selectSelectedInternalAccount,
    selectAllTokens,
    selectNetworkConfigurations,
    selectNativeTokensAcrossChains,
  ],
  (selectedAccount, allTokens, networkConfigurations, nativeTokens) => {
    const selectedAddress = selectedAccount?.address;
    const tokensByChain: {
      [chainId: string]: (
        | TokenI
        | (Token & { isStaked?: boolean; isNative?: boolean; isETH?: boolean })
      )[];
    } = {};

    if (!selectedAddress) {
      return tokensByChain;
    }

    // Create a list of available chainIds
    const chainIds = Object.keys(networkConfigurations);

    for (const chainId of chainIds) {
      const currentChainId = chainId as Hex;
      const nonNativeTokens =
        allTokens[currentChainId]?.[selectedAddress]?.map((token) => ({
          ...token,
          token: token.name,
          chainId,
          isETH: false,
          isNative: false,
          balanceFiat: '',
          isStaked: false,
        })) || [];

      // Add both native and non-native tokens
      tokensByChain[currentChainId] = [
        ...(nativeTokens[currentChainId] || []),
        ...nonNativeTokens,
      ];
    }

    return tokensByChain;
  },
);

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

export const selectMultichainIsEvm = createSelector(
  selectSelectedInternalAccount,
  (selectedAccount) => {
    // If no account selected, assume EVM for onboarding scenario
    if (!selectedAccount) {
      return true;
    }
    return isEvmAccountType(selectedAccount.type);
  },
);

export const selectMultichainDefaultToken = createSelector(
  selectMultichainIsEvm,
  selectProviderConfig,
  (isEvm, providerConfig) => {
    const symbol = isEvm
      ? providerConfig?.ticker ?? 'ETH'
      : providerConfig?.ticker;
    return { symbol };
  },
);

export const selectMultichainIsBitcoin = createSelector(
  selectMultichainIsEvm,
  selectMultichainDefaultToken,
  (isEvm, token) => !isEvm && token.symbol === 'BTC',
);

export const selectMultichainProviderConfig = createSelector(
  selectProviderConfig,
  (providerConfig) => providerConfig,
);

export const selectMultichainCurrentNetwork = selectMultichainProviderConfig;

export const selectMultichainNativeCurrency = createSelector(
  selectMultichainIsEvm,
  selectTicker,
  selectProviderConfig,
  (isEvm, ticker, providerConfig) => (isEvm ? ticker : providerConfig?.ticker),
);

export const selectMultichainCurrentCurrency = createSelector(
  selectMultichainIsEvm,
  selectCurrentCurrency,
  selectProviderConfig,
  (isEvm, currentCurrency, providerConfig) => {
    if (isEvm) {
      return currentCurrency;
    }
    // For non-EVM:
    return currentCurrency?.toLowerCase() === 'usd'
      ? 'usd'
      : providerConfig.ticker;
  },
);

export const selectMultichainShouldShowFiat = createSelector(
  selectMultichainIsEvm,
  selectChainId,
  (state: RootState) => state.settings.showFiatOnTestnets,
  selectSelectedInternalAccount,
  selectMultichainIsBitcoin,
  (isEvm, chainId, showFiatOnTestnets, selectedAccount, isBitcoin) => {
    if (isEvm) {
      // EVM logic: show fiat on mainnet or showFiatOnTestnets if testnet
      if (!isTestNet(chainId)) {
        return true; // mainnet
      }
      return showFiatOnTestnets;
    }

    // Non-EVM logic: currently we only have Bitcoin as example
    // Show fiat if mainnet or if testnet + showFiatOnTestnets is true
    if (isBitcoin && selectedAccount) {
      const isMainnet = isBtcMainnetAddress(selectedAccount.address);
      const isTestnet = isBtcTestnetAddress(selectedAccount.address);

      if (isMainnet) return true;
      if (isTestnet) return showFiatOnTestnets;
    }

    // If other non-EVM networks are supported, adjust logic as needed.
    return true;
  },
);

export const selectMultichainCurrentChainId = selectChainId;

export const selectMultichainIsMainnet = createSelector(
  selectMultichainIsEvm,
  selectSelectedInternalAccount,
  selectChainId,
  selectMultichainIsBitcoin,
  (isEvm, selectedAccount, chainId, isBitcoin) => {
    if (isEvm) {
      return isMainNet(chainId);
    }

    // Non-EVM: Currently only Bitcoin
    if (isBitcoin && selectedAccount) {
      return isBtcMainnetAddress(selectedAccount.address);
    }

    // If other non-EVM networks: adjust accordingly
    return false;
  },
);

export const selectMultichainIsTestnet = createSelector(
  selectMultichainIsEvm,
  selectSelectedInternalAccount,
  selectChainId,
  selectMultichainIsBitcoin,
  (isEvm, selectedAccount, chainId, isBitcoin) => {
    if (isEvm) {
      return isTestNet(chainId);
    }

    if (isBitcoin && selectedAccount) {
      return isBtcTestnetAddress(selectedAccount.address);
    }

    // For other non-EVM networks, implement similar logic
    return false;
  },
);

/**
 * If MultichainBalancesController state is integrated into the engine background state,
 * adapt the following selector. If not, please provide that part of the state so we can adjust.
 */
export const selectMultichainBalances = createSelector(
  // Placeholder: adapt to where balances from MultichainBalancesController are stored.
  (state: RootState) =>
    state.engine.backgroundState.MultichainBalancesController?.balances ?? {},
  (balances) => balances,
);

export const selectMultichainCoinRates = selectCurrencyRates;

export const selectMultichainSelectedAccountCachedBalance = createSelector(
  selectSelectedInternalAccountFormattedAddress,
  selectAccountsByChainId,
  selectMultichainIsEvm,
  selectChainId,
  selectSelectedInternalAccount,
  (selectedAddress, accountsByChainId, isEvm, chainId, selectedAccount) => {
    if (!selectedAddress || !chainId) return '0x0';
    const account = accountsByChainId[chainId]?.[selectedAddress];
    if (!account) return '0x0';

    // For EVM: `account.balance` should be a hex string (e.g. '0x1234...')
    // For Bitcoin: If the MultichainBalancesController stores balance as a decimal or something else,
    // convert or adapt accordingly. If it stores amounts in sats, for example, convert if needed.
    return account.balance || '0x0';
  },
);

export const selectMultichainSelectedAccountCachedBalanceIsZero =
  createSelector(
    selectMultichainSelectedAccountCachedBalance,
    selectMultichainIsEvm,
    (balance, isEvm) => {
      const base = isEvm ? 16 : 10;
      const numericValue = parseInt(balance, base);
      return numericValue === 0;
    },
  );

export const selectMultichainConversionRate = createSelector(
  selectMultichainIsEvm,
  selectConversionRate,
  selectCurrencyRates,
  selectProviderConfig,
  (isEvm, evmConversionRate, currencyRates, providerConfig) => {
    if (isEvm) {
      return evmConversionRate;
    }
    const ticker = providerConfig?.ticker?.toLowerCase();
    return ticker ? currencyRates?.[ticker]?.conversionRate : undefined;
  },
);
