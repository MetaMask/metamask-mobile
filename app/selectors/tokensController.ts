import { Hex } from '@metamask/utils';
import { createSelector } from 'reselect';
import { TokensControllerState, Token } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectSelectedInternalAccountAddress } from './accountsController';
import { isPortfolioViewEnabled } from '../util/networks';
import {
  selectEvmChainId,
  selectEvmNetworkConfigurationsByChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from './networkController';
import { PopularList } from '../util/networks/customNetworks';
import { ChainId } from '@metamask/controller-utils';

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

export const selectAllTokens = createDeepEqualSelector(
  selectTokensControllerState,
  (tokensControllerState: TokensControllerState) =>
    tokensControllerState?.allTokens,
);

export const getChainIdsToPoll = createDeepEqualSelector(
  selectEvmNetworkConfigurationsByChainId,
  selectEvmChainId,
  (networkConfigurations, currentChainId) => {
    if (!isPortfolioViewEnabled()) {
      return [currentChainId];
    }

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
  selectSelectedInternalAccountAddress,
  (_state: RootState, tokenAddress: Hex) => tokenAddress,
  (_state: RootState, _tokenAddress: Hex, chainId: Hex) => chainId,
  (allTokens, selectedAddress, tokenAddress, chainId) => {
    if (!selectedAddress) return undefined;

    const tokensForAddressAndChain =
      allTokens[chainId]?.[selectedAddress] ?? [];

    return tokensForAddressAndChain.find(
      (token) => token.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
  },
);
