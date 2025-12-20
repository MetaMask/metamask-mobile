import { createSelector } from 'reselect';
import { TokenListState, TokenListToken } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { RootState } from '../reducers';
import { tokenListToArray } from '../util/tokens';
import { createDeepEqualSelector } from '../selectors/util';
import { selectEvmChainId } from './networkController';

/**
 * Fallback metadata for aTokens not yet in the tokens API.
 * Temporary until the API includes these tokens.
 */

const ATOKEN_METADATA_FALLBACK: Record<
  Hex,
  Record<string, Partial<TokenListToken>>
> = {
  // Mainnet (chainId: 0x1)
  '0x1': {
    '0xaa0200d169ff3ba9385c12e073c5d1d30434ae7b': {
      name: 'Aave v3 MUSD',
      symbol: 'AMUSD',
      decimals: 6,
    },
  },
  // Linea Mainnet (chainId: 0xe708)
  '0xe708': {
    '0x61b19879f4033c2b5682a969cccc9141e022823c': {
      name: 'Aave v3 MUSD',
      symbol: 'AMUSD',
      decimals: 6,
    },
  },
};

const selectTokenListConstrollerState = (state: RootState) =>
  state.engine.backgroundState.TokenListController;

/**
 * Enriches tokensChainsCache with fallback metadata for aTokens.
 * Adds missing token metadata using ATOKEN_METADATA_FALLBACK.
 */
const selectTokensChainsCacheEnriched = createSelector(
  selectTokenListConstrollerState,
  (tokenListControllerState): TokenListState['tokensChainsCache'] => {
    const rawCache = tokenListControllerState?.tokensChainsCache;
    if (!rawCache) return rawCache;

    const enrichedCache = { ...rawCache };

    for (const [chainId, fallbackTokens] of Object.entries(
      ATOKEN_METADATA_FALLBACK,
    )) {
      const hexChainId = chainId as Hex;

      // Create chain entry if it doesn't exist
      if (!enrichedCache[hexChainId]) {
        enrichedCache[hexChainId] = {
          timestamp: Date.now(),
          data: {},
        };
      } else if (!enrichedCache[hexChainId].data) {
        enrichedCache[hexChainId] = {
          ...enrichedCache[hexChainId],
          data: {},
        };
      } else {
        // Clone chain data to avoid mutation
        enrichedCache[hexChainId] = {
          ...enrichedCache[hexChainId],
          data: { ...enrichedCache[hexChainId].data },
        };
      }

      for (const [address, metadata] of Object.entries(fallbackTokens)) {
        const lowercaseAddress = address.toLowerCase();
        // Only add if not already present
        if (!enrichedCache[hexChainId].data[lowercaseAddress]) {
          enrichedCache[hexChainId].data[lowercaseAddress] = {
            address: lowercaseAddress,
            ...metadata,
          } as TokenListToken;
        }
      }
    }

    return enrichedCache;
  },
);

/**
 * Return token list from TokenListController with fallback metadata.
 * Can pass directly into useSelector.
 */
export const selectTokenList = createSelector(
  selectTokensChainsCacheEnriched,
  selectEvmChainId,
  (tokensChainsCache, chainId) => tokensChainsCache?.[chainId]?.data || [],
);

/**
 * Return token list array from TokenListController.
 * Can pass directly into useSelector.
 */
export const selectTokenListArray = createDeepEqualSelector(
  selectTokenList,
  tokenListToArray,
);

const selectERC20TokensByChainInternal = createDeepEqualSelector(
  selectTokensChainsCacheEnriched,
  (tokensChainsCache) => tokensChainsCache,
);

export const selectERC20TokensByChain = createDeepEqualSelector(
  selectERC20TokensByChainInternal,
  (tokensChainsCache) => tokensChainsCache,
);
