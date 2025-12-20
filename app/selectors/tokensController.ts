import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { TokensControllerState, Token } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from './networkController';
import { PopularList } from '../util/networks/customNetworks';
import { ChainId } from '@metamask/controller-utils';
import { ATOKEN_METADATA_FALLBACK } from '../constants/tokens';

const selectTokensControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.TokensController;

export const selectTokens = createDeepEqualSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allTokens[chainId]?.[selectedAddress as Hex] || [],
);

export const selectTokensByChainIdAndAddress = createDeepEqualSelector(
  selectTokensControllerState,
  selectSelectedInternalAccountAddress,
  (_state, chainId: Hex) => chainId,
  (
    tokensControllerState: TokensControllerState,
    selectedAddress: string | undefined,
    chainId: Hex,
  ) =>
    tokensControllerState?.allTokens[chainId]?.[selectedAddress as Hex]?.reduce(
      (tokensMap: { [address: string]: Token }, token: Token) => ({
        ...tokensMap,
        [token.address]: token,
      }),
      {},
    ) ?? {},
);

export const selectTokensByAddress = createSelector(
  selectTokens,
  (tokens: Token[]) =>
    tokens?.reduce((tokensMap: { [address: string]: Token }, token: Token) => {
      tokensMap[token.address] = token;
      return tokensMap;
    }, {}),
);

export const selectTokensLength = createSelector(
  selectTokens,
  (tokens: Token[]) => tokens.length,
);

export const selectIgnoreTokens = createSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allIgnoredTokens?.[chainId]?.[
      selectedAddress as Hex
    ],
);

export const selectDetectedTokens = createSelector(
  selectTokensControllerState,
  selectEvmChainId,
  selectSelectedInternalAccountAddress,
  (
    tokensControllerState: TokensControllerState,
    chainId: Hex,
    selectedAddress: string | undefined,
  ) =>
    tokensControllerState?.allDetectedTokens?.[chainId]?.[
      selectedAddress as Hex
    ],
);

const selectAllTokensRaw = createDeepEqualSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.allTokens,
);

/**
 * Enriched selectAllTokens that applies fallback metadata for aTokens.
 * This ensures aTokens have correct name/symbol even when API data is missing.
 */
export const selectAllTokens = createDeepEqualSelector(
  selectAllTokensRaw,
  (allTokens): TokensControllerState['allTokens'] => {
    if (!allTokens) return allTokens;

    const enriched: TokensControllerState['allTokens'] = {};

    for (const [chainId, addressTokens] of Object.entries(allTokens)) {
      const fallbacksForChain = ATOKEN_METADATA_FALLBACK[chainId as Hex];

      if (!fallbacksForChain) {
        enriched[chainId as Hex] = addressTokens;
        continue;
      }

      // Enrich tokens for each address on this chain
      enriched[chainId as Hex] = {};
      for (const [address, tokens] of Object.entries(addressTokens)) {
        enriched[chainId as Hex][address as Hex] = tokens.map((token) => {
          const fallback = fallbacksForChain[token.address?.toLowerCase()];
          if (fallback) {
            return {
              ...token,
              name: fallback.name,
              symbol: fallback.symbol,
              decimals: token.decimals ?? fallback.decimals,
            };
          }
          return token;
        });
      }
    }

    return enriched;
  },
);

export const getChainIdsToPoll = createDeepEqualSelector(
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
  (networkConfigurations, currentChainId) => {
    const popularNetworksChainIds = PopularList.map(
      (popular) => popular.chainId,
    );
    return Object.keys(networkConfigurations).filter(
      (chainId) =>
        chainId === currentChainId ||
        chainId === ChainId.mainnet ||
        chainId === ChainId['linea-mainnet'] ||
        popularNetworksChainIds.includes(chainId as Hex),
    );
  },
);

export const selectAllTokensFlat = createSelector(
  selectAllTokens,
  (tokensByAccountByChain: {
    [account: string]: { [chainId: string]: Token[] };
  }): Token[] => {
    if (Object.values(tokensByAccountByChain).length === 0) {
      return [];
    }
    const tokensByAccountArray = Object.values(tokensByAccountByChain);

    return tokensByAccountArray.reduce<Token[]>((acc, tokensByAccount) => {
      const tokensArray = Object.values(tokensByAccount).flat();
      return acc.concat(...tokensArray);
    }, []);
  },
);

export const selectAllDetectedTokensForSelectedAddress = createSelector(
  selectTokensControllerState,
  selectSelectedInternalAccountAddress,
  (tokensControllerState, selectedAddress) => {
    // Updated return type to specify the structure more clearly
    if (!selectedAddress) {
      return {} as { [chainId: Hex]: Token[] }; // Specify return type
    }

    return Object.entries(
      tokensControllerState?.allDetectedTokens || {},
    ).reduce<{
      [chainId: string]: Token[];
    }>((acc, [chainId, chainTokens]) => {
      const tokensForAddress = chainTokens[selectedAddress] || [];
      if (tokensForAddress.length > 0) {
        acc[chainId] = tokensForAddress.map((token: Token) => ({
          ...token,
          chainId,
        }));
      }
      return acc;
    }, {});
  },
);

export const selectAllDetectedTokensFlat = createSelector(
  selectAllDetectedTokensForSelectedAddress,
  (detectedTokensByChain: { [chainId: string]: Token[] }) => {
    if (Object.keys(detectedTokensByChain).length === 0) {
      return [];
    }

    const flattenedTokens: (Token & { chainId: Hex })[] = [];

    for (const [chainId, addressTokens] of Object.entries(
      detectedTokensByChain,
    )) {
      for (const token of addressTokens) {
        flattenedTokens.push({
          ...token,
          chainId: chainId as Hex,
        });
      }
    }

    return flattenedTokens;
  },
);

// Full selector implementation with selected address filtering
export const selectTransformedTokens = createSelector(
  selectAllTokens,
  selectSelectedInternalAccountAddress,
  selectEvmChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  (
    allTokens: TokensControllerState['allTokens'],
    selectedAddress: string | undefined,
    networkId: Hex,
    isAllNetworks: boolean,
    isPopularNetwork: boolean,
  ) => {
    if (!isAllNetworks || !isPopularNetwork) {
      return allTokens[networkId]?.[selectedAddress as Hex];
    }

    // Filter for the selected address and transform
    const flatList = Object.entries(allTokens).flatMap(
      ([chainId, addresses]) => {
        if (selectedAddress && addresses[selectedAddress]) {
          return addresses[selectedAddress].map((token) => ({
            ...token,
            chainId, // Add chainId to the token property
            address: selectedAddress, // Add the selected address as a property
          }));
        }
        return [];
      },
    );

    return flatList;
  },
);

export const selectSingleTokenByAddressAndChainId = createSelector(
  selectAllTokens,
  (_state: RootState, tokenAddress: Hex) => tokenAddress,
  (_state: RootState, _tokenAddress: Hex, chainId: Hex) => chainId,
  (allTokens, tokenAddress, chainId) => {
    const chainTokens = Object.values(allTokens[chainId] ?? {}).flat();

    return chainTokens.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
  },
);
