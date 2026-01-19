import { createSelector } from 'reselect';
import { isMainnetByChainId } from '../../util/networks';
import { safeToChecksumAddress, areAddressesEqual } from '../../util/address';
import { lte } from '../../util/lodash';
import { selectEvmChainId } from '../../selectors/networkController';
import {
  selectAllTokens,
  selectTokens,
} from '../../selectors/tokensController';
import { selectTokenList } from '../../selectors/tokenListController';
import { selectContractBalances } from '../../selectors/tokenBalancesController';
import { getSwapsLiveness } from './utils';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { CHAIN_ID_TO_NAME_MAP } from '@metamask/swaps-controller/dist/constants';
import { invert, omit } from 'lodash';
import { createDeepEqualSelector } from '../../selectors/util';
import { toHex } from '@metamask/controller-utils';

// Identity function, will be removed when legacy swaps is removed,
// but keep it for now to keep changes atomic.
export const getFeatureFlagChainId = (chainId) => chainId;

// * Constants
export const SWAPS_SET_LIVENESS = 'SWAPS_SET_LIVENESS';
export const SWAPS_SET_HAS_ONBOARDED = 'SWAPS_SET_HAS_ONBOARDED';
const MAX_TOKENS_WITH_BALANCE = 5;

// * Action Creator
export const setSwapsLiveness = (chainId, featureFlags) => ({
  type: SWAPS_SET_LIVENESS,
  payload: { chainId, featureFlags },
});
export const setSwapsHasOnboarded = (hasOnboarded) => ({
  type: SWAPS_SET_HAS_ONBOARDED,
  payload: hasOnboarded,
});

// * Functions

/**
 * Processes and normalizes a token by removing unwanted properties
 * and ensuring consistent data types
 */
function processToken(token) {
  if (!token) return null;
  const { hasBalanceError, image, ...tokenData } = token;
  return {
    occurrences: 0,
    ...tokenData,
    decimals: Number(tokenData.decimals),
    address: tokenData.address.toLowerCase(),
  };
}

/**
 * Combines tokens from multiple sources with deduplication
 * Maintains first-occurrence-wins behavior
 */
function combineTokens(tokenSources) {
  const tokenMap = new Map();

  for (const tokens of tokenSources) {
    if (!tokens) continue;

    for (const token of tokens) {
      const processedToken = processToken(token);
      if (processedToken && !tokenMap.has(processedToken.address)) {
        tokenMap.set(processedToken.address, processedToken);
      }
    }
  }

  return Array.from(tokenMap.values());
}

function addMetadata(chainId, tokens, tokenList) {
  if (!isMainnetByChainId(chainId)) {
    return tokens;
  }
  return tokens.map((token) => {
    const tokenMetadata = tokenList[safeToChecksumAddress(token.address)];
    if (tokenMetadata) {
      return { ...token, name: tokenMetadata.name };
    }

    return token;
  });
}

// * Selectors
const chainIdSelector = selectEvmChainId;
const swapsStateSelector = (state) => state.swaps;

/**
 * Returns if smart transactions are enabled in feature flags
 */
export const swapsSmartTxFlagEnabled = createSelector(
  swapsStateSelector,
  (swapsState) => {
    const globalFlags = swapsState.featureFlags;
    const isEnabled = Boolean(globalFlags?.smartTransactions?.mobileActive);
    return isEnabled;
  },
);

/**
 * Returns the swaps feature flags
 */
export const selectSwapsChainFeatureFlags = createSelector(
  swapsStateSelector,
  (_state, transactionChainId) =>
    transactionChainId || selectEvmChainId(_state),
  (swapsState, chainId) => ({
    ...(swapsState[chainId]?.featureFlags || {}),
    smartTransactions: {
      ...(swapsState[chainId]?.featureFlags?.smartTransactions || {}),
      ...(swapsState.featureFlags?.smartTransactions || {}),
    },
  }),
);

/**
 * Returns the swaps onboarded state
 */

export const swapsHasOnboardedSelector = createSelector(
  swapsStateSelector,
  (swapsState) => swapsState.hasOnboarded,
);

const selectSwapsControllerState = (state) =>
  state.engine.backgroundState.SwapsController;

/**
 * Returns the swaps tokens from the state
 */
export const swapsControllerTokens = (state) =>
  state.engine.backgroundState.SwapsController.tokens;

export const selectSwapsApprovalTransaction = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.approvalTransaction,
);
export const selectSwapsQuoteValues = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.quoteValues,
);
export const selectSwapsQuotes = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.quotes,
);
export const selectSwapsAggregatorMetadata = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.aggregatorMetadata,
);
export const selectSwapsError = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.error,
);
export const selectSwapsQuoteRefreshSeconds = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.quoteRefreshSeconds,
);
export const selectSwapsUsedGasEstimate = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.usedGasEstimate,
);
export const selectSwapsUsedCustomGas = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.usedCustomGas,
);
export const selectSwapsTopAggId = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.topAggId,
);
export const selectSwapsPollingCyclesLeft = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.pollingCyclesLeft,
);
export const selectSwapsQuotesLastFetched = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.quotesLastFetched,
);
export const selectSwapsIsInPolling = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.isInPolling,
);

const swapsControllerAndUserTokens = createSelector(
  swapsControllerTokens,
  selectTokens,
  (swapsTokens, tokens) => combineTokens([swapsTokens, tokens]),
);

const swapsControllerAndUserTokensMultichain = createDeepEqualSelector(
  swapsControllerTokens,
  selectAllTokens,
  selectSelectedInternalAccountAddress,
  (swapsTokens, allTokens, currentUserAddress) => {
    // Flatten user tokens from all chains
    const userTokensFlat = [];
    if (allTokens && currentUserAddress) {
      for (const chainId in allTokens) {
        const chainTokens = allTokens[chainId];
        if (!chainTokens || !chainTokens[currentUserAddress]) continue;

        const userTokensForChain = chainTokens[currentUserAddress];
        if (Array.isArray(userTokensForChain)) {
          userTokensFlat.push(...userTokensForChain);
        }
      }
    }

    return combineTokens([swapsTokens, userTokensFlat]);
  },
);

export const swapsTokensSelector = createSelector(
  chainIdSelector,
  swapsControllerAndUserTokens,
  selectTokenList,
  (chainId, tokens, tokenList) => {
    if (!tokens) {
      return [];
    }

    return addMetadata(chainId, tokens, tokenList);
  },
);

export const topAssets = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.topAssets,
);

export const selectChainCache = createSelector(
  selectSwapsControllerState,
  (swapsControllerState) => swapsControllerState.chainCache,
);

/**
 * Returns a memoized object that only has the addesses of the tokens as keys
 * and undefined as value. Useful to check if a token is supported by swaps.
 */
export const swapsTokensObjectSelector = createSelector(
  swapsControllerAndUserTokens,
  (tokens) => {
    if (!tokens || tokens.length === 0) {
      return {};
    }

    const result = {};
    for (const token of tokens) {
      result[token.address] = undefined;
    }
    return result;
  },
);

/**
 * Returns a memoized object that only has the addresses cross chains of the tokens as keys
 * and undefined as value. Useful to check if a token is supported by swaps.
 */
export const swapsTokensMultiChainObjectSelector = createSelector(
  swapsControllerAndUserTokensMultichain,
  (tokens) => {
    if (!tokens || tokens.length === 0) {
      return {};
    }

    const result = {};
    for (const token of tokens) {
      result[token.address] = undefined;
    }
    return result;
  },
);

/**
 * Returns an array of tokens to display by default on the selector modal
 * based on the current account's balances.
 */
export const swapsTokensWithBalanceSelector = createSelector(
  chainIdSelector,
  swapsControllerAndUserTokens,
  selectTokenList,
  selectContractBalances,
  (chainId, tokens, tokenList, balances) => {
    if (!tokens) {
      return [];
    }
    const baseTokens = tokens;
    const tokensAddressesWithBalance = Object.entries(balances)
      .filter(([, balance]) => balance !== 0)
      .sort(([, balanceA], [, balanceB]) => (lte(balanceB, balanceA) ? -1 : 1))
      .map(([address]) => address.toLowerCase());
    const tokensWithBalance = [];
    const originalTokens = [];

    for (let i = 0; i < baseTokens.length; i++) {
      if (tokensAddressesWithBalance.includes(baseTokens[i].address)) {
        tokensWithBalance.push(baseTokens[i]);
      } else {
        originalTokens.push(baseTokens[i]);
      }

      if (
        tokensWithBalance.length === tokensAddressesWithBalance.length &&
        tokensWithBalance.length + originalTokens.length >=
          MAX_TOKENS_WITH_BALANCE
      ) {
        break;
      }
    }

    const result = [...tokensWithBalance, ...originalTokens].slice(
      0,
      Math.max(tokensWithBalance.length, MAX_TOKENS_WITH_BALANCE),
    );
    return addMetadata(chainId, result, tokenList);
  },
);

/**
 * Returns an array of tokens to display by default on the selector modal
 * based on the current account's balances.
 */
export const swapsTopAssetsSelector = createSelector(
  chainIdSelector,
  swapsControllerAndUserTokens,
  selectTokenList,
  topAssets,
  (chainId, tokens, tokenList, topAssets) => {
    if (!topAssets || !tokens) {
      return [];
    }
    const result = topAssets
      .map(({ address }) =>
        tokens?.find((token) => areAddressesEqual(token.address, address)),
      )
      .filter(Boolean);
    return addMetadata(chainId, result, tokenList);
  },
);

// * Reducer
export const initialState = {
  isLive: true, // TODO: should we remove it?
  hasOnboarded: true, // TODO: Once we have updated UI / content for the modal, we should enable it again.

  featureFlags: undefined,
  '0x1': {
    isLive: true,
    featureFlags: undefined,
  },
};

function swapsReducer(state = initialState, action) {
  switch (action.type) {
    case SWAPS_SET_LIVENESS: {
      const { chainId: rawChainId, featureFlags } = action.payload;
      const chainId = getFeatureFlagChainId(rawChainId);

      const data = state[chainId];

      const chainNoFlags = {
        ...data,
        featureFlags: undefined,
        isLive: false,
      };

      if (!featureFlags) {
        return {
          ...state,
          [chainId]: chainNoFlags,
          [rawChainId]: chainNoFlags,
          featureFlags: undefined,
        };
      }

      const newState = {
        ...state,
        featureFlags: {
          smart_transactions: featureFlags.smart_transactions,
          smartTransactions: featureFlags.smartTransactions,
        },
      };

      // Testnet has the same name as mainnet, but occurs later in the map,
      // so we need to omit it from the mapping, otherwise it will override 0x1
      const noTestnetChainIdToNameMap = omit(
        CHAIN_ID_TO_NAME_MAP,
        toHex('1337'),
      );
      // Invert CHAIN_ID_TO_NAME_MAP to get chain name to ID mapping
      // It will be e.g. { 'ethereum': '0x1', 'bsc': '0x38' }
      const chainNameToIdMap = invert(noTestnetChainIdToNameMap);

      // Save chain-specific feature flags for each chain
      Object.keys(featureFlags).forEach((chainName) => {
        const chainIdForName = chainNameToIdMap[chainName];

        if (
          chainIdForName &&
          featureFlags[chainName] &&
          typeof featureFlags[chainName] === 'object'
        ) {
          const chainFeatureFlags = featureFlags[chainName];
          const chainLiveness = getSwapsLiveness(featureFlags, chainIdForName);

          newState[chainIdForName] = {
            ...state[chainIdForName],
            featureFlags: chainFeatureFlags,
            isLive: chainLiveness,
          };

          if (chainIdForName === chainId && rawChainId !== chainId) {
            newState[rawChainId] = newState[chainIdForName];
          }
        }
      });

      return newState;
    }
    case SWAPS_SET_HAS_ONBOARDED: {
      return {
        ...state,
        hasOnboarded: Boolean(action.payload),
      };
    }
    default: {
      return state;
    }
  }
}

export default swapsReducer;
