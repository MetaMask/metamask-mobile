import { createSelector } from 'reselect';
import { Hex } from '@metamask/utils';
import { Token, getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  selectSelectedInternalAccountFormattedAddress,
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../accountsController';
import { selectAllTokens } from '../tokensController';
import {
  selectAccountBalanceByChainId,
  selectAccountsByChainId,
} from '../accountTrackerController';
import {
  selectChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectEvmTicker,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../networkController';
import { TokenI } from '../../components/UI/Tokens/types';
import { renderFromWei, weiToFiat } from '../../util/number';
import { hexToBN, toHex } from '@metamask/controller-utils';
import {
  selectConversionRate,
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../currencyRateController';
import { createDeepEqualSelector } from '../util';
import { getTicker } from '../../util/transactions';
import { zeroAddress } from 'ethereumjs-util';
import { selectHideZeroBalanceTokens } from '../settings';
import { selectTokensBalances } from '../tokenBalancesController';
import { isZero } from '../../util/lodash';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../preferencesController';
import { selectIsEvmNetworkSelected } from '../multichainNetworkController';
import { isTestNet } from '../../util/networks';

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
    selectEvmNetworkConfigurationsByChainId,
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
export const selectAccountTokensAcrossChains = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectAllTokens,
  selectEvmNetworkConfigurationsByChainId,
  selectNativeTokensAcrossChains,
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

export const selectNativeEvmAsset = createDeepEqualSelector(
  selectAccountBalanceByChainId,
  selectEvmTicker,
  selectConversionRate,
  selectCurrentCurrency,
  (accountBalanceByChainId, ticker, conversionRate, currentCurrency) => {
    if (!accountBalanceByChainId) {
      return;
    }
    return {
      decimals: 18,
      name: getTicker(ticker) === 'ETH' ? 'Ethereum' : ticker,
      symbol: getTicker(ticker),
      isETH: true,
      balance: renderFromWei(accountBalanceByChainId.balance),
      balanceFiat: weiToFiat(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hexToBN(accountBalanceByChainId.balance) as any,
        conversionRate,
        currentCurrency,
      ),
      logo: '../images/eth-logo-new.png',
      address: zeroAddress(),
    };
  },
);

export const selectStakedEvmAsset = createDeepEqualSelector(
  selectAccountBalanceByChainId,
  selectConversionRate,
  selectCurrentCurrency,
  selectNativeEvmAsset,
  (accountBalanceByChainId, conversionRate, currentCurrency, nativeAsset) => {
    if (!accountBalanceByChainId) {
      return;
    }
    if (!accountBalanceByChainId.stakedBalance) {
      return;
    }
    if (hexToBN(accountBalanceByChainId.stakedBalance).isZero()) {
      return;
    }
    if (!nativeAsset) {
      return;
    }
    return {
      ...nativeAsset,
      name: 'Staked Ethereum',
      isStaked: true,
      balance: renderFromWei(accountBalanceByChainId.stakedBalance),
      balanceFiat: weiToFiat(
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hexToBN(accountBalanceByChainId.stakedBalance) as any,
        conversionRate,
        currentCurrency,
      ),
    };
  },
);

export const selectEvmTokensWithZeroBalanceFilter = createDeepEqualSelector(
  selectHideZeroBalanceTokens,
  selectAccountTokensAcrossChains,
  selectTokensBalances,
  selectSelectedInternalAccountAddress,
  selectIsTokenNetworkFilterEqualCurrentNetwork,
  (
    hideZeroBalanceTokens,
    selectedAccountTokensChains,
    multiChainTokenBalance,
    selectedInternalAccountAddress,
    isUserOnCurrentNetwork,
  ) => {
    const allTokens = Object.values(
      selectedAccountTokensChains,
    ).flat() as TokenI[];

    let tokensToDisplay: TokenI[] = allTokens;

    // Respect zero balance filtering settings
    if (hideZeroBalanceTokens) {
      tokensToDisplay = allTokens.filter((token) => {
        const multiChainTokenBalances =
          multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
            token.chainId as Hex
          ];
        const balance =
          multiChainTokenBalances?.[token.address as Hex] || token.balance;

        return (
          !isZero(balance) ||
          (isUserOnCurrentNetwork && (token.isNative || token.isStaked))
        );
      });
    }
    return tokensToDisplay;
  },
);

export const selectEvmTokens = createDeepEqualSelector(
  selectEvmTokensWithZeroBalanceFilter,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectIsEvmNetworkSelected,
  selectChainId,
  (
    tokensToDisplay,
    isAllNetworks,
    isPopularNetwork,
    isEvmSelected,
    currentChainId,
  ) => {
    // Apply network filtering
    const filteredTokens =
      isAllNetworks && isPopularNetwork && isEvmSelected
        ? tokensToDisplay
        : tokensToDisplay.filter((token) => token.chainId === currentChainId);

    // Categorize tokens as native or non-native, filtering out testnet tokens if applicable
    const nativeTokens: TokenI[] = [];
    const nonNativeTokens: TokenI[] = [];

    for (const currToken of filteredTokens) {
      const token = currToken as TokenI & { chainId: string };

      // Skip tokens if they are on a test network and the current chain is not a test network
      if (isTestNet(token.chainId) && !isTestNet(currentChainId)) {
        continue;
      }

      // Categorize tokens as native or non-native
      if (token.isNative) {
        nativeTokens.push(token);
      } else {
        nonNativeTokens.push(token);
      }
    }

    return [...nativeTokens, ...nonNativeTokens];
  },
);
