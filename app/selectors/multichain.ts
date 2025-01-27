import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { Token, getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  selectSelectedInternalAccountFormattedAddress,
  selectSelectedInternalAccount,
} from './accountsController';
import { selectAllTokens } from './tokensController';
import { selectAccountsByChainId } from './accountTrackerController';
import { selectNetworkConfigurations } from './networkController';
import { TokenI } from '../components/UI/Tokens/types';
import { renderFromWei, weiToFiat } from '../util/number';
import { hexToBN, toHex } from '@metamask/controller-utils';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from './currencyRateController';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { RootState } from '../reducers';
///: END:ONLY_INCLUDE_IF

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

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
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
///: END:ONLY_INCLUDE_IF
