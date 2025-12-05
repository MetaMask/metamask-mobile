import { createSelector } from 'reselect';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
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
  selectEvmNetworkConfigurationsByChainId,
  selectEvmTicker,
  selectNetworkConfigurations,
} from '../networkController';
import { TokenI } from '../../components/UI/Tokens/types';
import { renderFromWei, weiToFiat } from '../../util/number';
import { hexToBN, toChecksumHexAddress } from '@metamask/controller-utils';
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
import { selectTokenMarketData } from '../tokenRatesController';
import { deriveBalanceFromAssetMarketDetails } from '../../components/UI/Tokens/util';
import { RootState } from '../../reducers';
import { selectTokenList } from '../tokenListController';
import { safeToChecksumAddress, toFormattedAddress } from '../../util/address';
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';

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
export const selectedAccountNativeTokenCachedBalanceByChainIdForAddress =
  createSelector(
    [
      selectAccountsByChainId,
      (_: RootState, address: string | undefined) => address,
    ],
    (accountsByChainId, address): ChainBalances => {
      if (!accountsByChainId || !address) {
        return {};
      }

      const checksumAddress = toChecksumHexAddress(address);

      const result: ChainBalances = {};
      for (const chainId in accountsByChainId) {
        const accounts = accountsByChainId[chainId];
        const account = accounts[checksumAddress];
        if (account) {
          result[chainId] = {
            balance: account.balance,
            stakedBalance: account.stakedBalance ?? '0x0',
            isStaked: false,
            name: '',
          };
        }
      }

      return result;
    },
  );

/**
 * Get the cached native token balance for the selected account by chainId.
 *
 * @param {RootState} state - The root state.
 * @returns {ChainBalances} The cached native token balance for the selected account by chainId.
 */
export const selectedAccountNativeTokenCachedBalanceByChainId = createSelector(
  [(state: RootState) => state, selectSelectedInternalAccountFormattedAddress],
  (state, selectedAddress): ChainBalances =>
    selectedAccountNativeTokenCachedBalanceByChainIdForAddress(
      state,
      selectedAddress,
    ),
);

/**
 * Selector to get native tokens for the selected account across all chains.
 */
export const selectNativeTokensAcrossChainsForAddress = createSelector(
  [
    selectEvmNetworkConfigurationsByChainId,
    (state: RootState, address: string | undefined) =>
      selectedAccountNativeTokenCachedBalanceByChainIdForAddress(
        state,
        address,
      ),
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
      const isETH = [
        'ETH',
        'GOETH',
        'SepoliaETH',
        'LineaETH',
        'MegaETH',
      ].includes(token.nativeCurrency || '');

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

      if (nativeTokenInfoByChainId && !nativeTokenInfoByChainId.isStaked) {
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
 * Selector to get native tokens for the selected account across all chains.
 */
export const selectNativeTokensAcrossChains = createSelector(
  [(state: RootState) => state, selectSelectedInternalAccountFormattedAddress],
  (state, selectedAddress) =>
    selectNativeTokensAcrossChainsForAddress(state, selectedAddress),
);

export const selectAccountTokensAcrossChainsForAddress =
  createDeepEqualSelector(
    selectAllTokens,
    selectEvmNetworkConfigurationsByChainId,
    (state: RootState, address: string | undefined) =>
      selectNativeTokensAcrossChainsForAddress(state, address),
    (_: RootState, address: string | undefined) => address,
    (allTokens, networkConfigurations, nativeTokens, address) => {
      const tokensByChain: {
        [chainId: string]: (
          | TokenI
          | (Token & {
              isStaked?: boolean;
              isNative?: boolean;
              isETH?: boolean;
            })
        )[];
      } = {};

      if (!address) {
        return tokensByChain;
      }

      // Create a list of available chainIds
      const chainIds = Object.keys(networkConfigurations);
      for (const chainId of chainIds) {
        const currentChainId = chainId as Hex;
        const nonNativeTokens =
          allTokens[currentChainId]?.[address]?.map((token) => ({
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
 * Get the tokens for the selected account across all chains.
 *
 * @param {RootState} state - The root state.
 * @returns {TokensByChain} The tokens for the selected account across all chains.
 */
export const selectAccountTokensAcrossChains = createSelector(
  (state: RootState) => state,
  selectSelectedInternalAccount,
  (state, selectedAccount) => {
    const selectedAddress = selectedAccount?.address;
    return selectAccountTokensAcrossChainsForAddress(state, selectedAddress);
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
  selectEnabledNetworksByNamespace,
  (tokensToDisplay, enabledNetworksByNamespace) => {
    // Apply network filtering based on enabled networks
    const enabledEip155Networks =
      enabledNetworksByNamespace?.[KnownCaipNamespace.Eip155];

    // Filter tokens to only show those on enabled networks
    const filteredTokens = enabledEip155Networks
      ? tokensToDisplay.filter((currentToken: TokenI) => {
          const chainId = currentToken.chainId || '';
          return enabledEip155Networks[chainId as Hex];
        })
      : tokensToDisplay;

    // Categorize tokens as native or non-native
    const nativeTokens: TokenI[] = [];
    const nonNativeTokens: TokenI[] = [];

    for (const currToken of filteredTokens) {
      const token = currToken as TokenI & { chainId: string };

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

export const selectEvmTokenFiatBalances = createDeepEqualSelector(
  selectEvmTokens,
  selectTokenMarketData,
  selectTokensBalances,
  selectSelectedInternalAccountAddress,
  selectNetworkConfigurations,
  selectCurrencyRates,
  selectCurrentCurrency,
  (
    evmTokens,
    multiChainMarketData,
    multiChainTokenBalance,
    selectedInternalAccountAddress,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
  ) =>
    evmTokens.map((token) => {
      const chainId = token.chainId as Hex;
      const multiChainExchangeRates = multiChainMarketData?.[chainId];
      const multiChainTokenBalances =
        multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
          chainId
        ];
      const nativeCurrency =
        networkConfigurationsByChainId[chainId].nativeCurrency;
      const multiChainConversionRate =
        multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

      return token.isETH || token.isNative
        ? parseFloat(token.balance) * multiChainConversionRate
        : deriveBalanceFromAssetMarketDetails(
            token,
            multiChainExchangeRates || {},
            multiChainTokenBalances || {},
            multiChainConversionRate || 0,
            currentCurrency || '',
          ).balanceFiatCalculation;
    }),
);

export const selectEvmTokenMarketData = createDeepEqualSelector(
  [
    selectTokenList,
    selectTokenMarketData,
    (_state: RootState, params: { chainId: Hex; tokenAddress?: string }) =>
      params.chainId,
    (_state: RootState, params: { chainId: Hex; tokenAddress?: string }) =>
      params.tokenAddress,
  ],
  (tokenList, marketData, chainId, tokenAddress) => {
    // Handle native token case (no address)
    if (!tokenAddress) {
      return marketData?.[chainId]?.[zeroAddress() as Hex];
    }

    // Get checksummed address
    const checksumAddress = safeToChecksumAddress(tokenAddress);
    if (!checksumAddress) return null;

    // Get token metadata and market data
    const tokenMetadata = tokenList?.[checksumAddress.toLowerCase()];
    const tokenMarketData = marketData?.[chainId]?.[checksumAddress as Hex];

    return {
      metadata: tokenMetadata,
      marketData: tokenMarketData,
    };
  },
);

/**
 * Creates a selector that finds a specific asset (token) by its address and chain ID.
 * This selector is particularly important for handling both native and staked assets
 * that may share the same address (e.g., 0x00) on the same chain.
 *
 * The selector uses a three-level nested map structure for efficient lookups:
 * 1. First level: chainId -> Map
 * 2. Second level: address -> Map
 * 3. Third level: isStaked (boolean) -> TokenI
 *
 * This structure allows us to:
 * - Efficiently look up tokens by chainId and address
 * - Properly distinguish between staked and non-staked assets that share the same address
 * - Handle native tokens (address: 0x00) correctly
 *
 * @example
 * // For native asset
 * const nativeAsset = selectAssetByAddressAndChainId(state, {
 *   address: '0x00',
 *   chainId: '0x1',
 *   isStaked: false
 * });
 *
 * // For staked asset
 * const stakedAsset = selectAssetByAddressAndChainId(state, {
 *   address: '0x00',
 *   chainId: '0x1',
 *   isStaked: true
 * });
 *
 * @returns A selector function that returns the matching TokenI or undefined if not found
 */
export const makeSelectAssetByAddressAndChainId = () =>
  createSelector(
    [
      selectEvmTokens, // TokenI[]
      selectIsEvmNetworkSelected,
      (
        _state: RootState,
        params: { address: string; chainId: string; isStaked?: boolean },
      ) => toFormattedAddress(params.address),
      (
        _state: RootState,
        params: { address: string; chainId: string; isStaked?: boolean },
      ) => params.chainId,
      (
        _state: RootState,
        params: { address: string; chainId: string; isStaked?: boolean },
      ) => params.isStaked,
    ],
    (
      tokens,
      isEvmNetworkSelected,
      address,
      chainId,
      isStaked,
    ): TokenI | undefined => {
      if (!isEvmNetworkSelected) {
        return undefined;
      }
      // Step 1: build nested map once per call
      const lookup = new Map<string, Map<string, Map<boolean, TokenI>>>();

      for (const token of tokens) {
        if (!token.chainId || !token.address) {
          continue; // skip invalid tokens
        }

        const tokenChainId = token.chainId;
        const tokenAddress = toFormattedAddress(token.address) as string;
        const tokenIsStaked = Boolean(token.isStaked); // this is important in order to differentiate between staked and non-staked tokens on the same chain

        if (!lookup.has(tokenChainId)) {
          lookup.set(tokenChainId, new Map());
        }
        const chainMap = lookup.get(tokenChainId);

        if (chainMap && !chainMap.has(tokenAddress)) {
          chainMap.set(tokenAddress, new Map());
        }
        const addressMap = chainMap?.get(tokenAddress);

        if (addressMap) {
          addressMap.set(tokenIsStaked, token);
        }
      }

      // Step 2: lookup
      const token = lookup
        .get(chainId)
        ?.get(address as string)
        ?.get(Boolean(isStaked));

      return token;
    },
  );
