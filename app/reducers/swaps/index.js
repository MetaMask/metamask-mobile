import { createSelector } from 'reselect';
import { getSwapsLiveness, CHAIN_ID_TO_NAME_MAP } from './utils';
import { invert, omit } from 'lodash';
import { toHex } from '@metamask/controller-utils';

export const getFeatureFlagChainId = (chainId) => chainId;

// * Constants
export const SWAPS_SET_LIVENESS = 'SWAPS_SET_LIVENESS';
export const SWAPS_SET_HAS_ONBOARDED = 'SWAPS_SET_HAS_ONBOARDED';

// * Action Creator
export const setSwapsLiveness = (chainId, featureFlags) => ({
  type: SWAPS_SET_LIVENESS,
  payload: { chainId, featureFlags },
});
export const setSwapsHasOnboarded = (hasOnboarded) => ({
  type: SWAPS_SET_HAS_ONBOARDED,
  payload: hasOnboarded,
});

// * Selectors
const swapsStateSelector = (state) => state.swaps;

/**
 * Returns the swaps onboarded state
 */
export const swapsHasOnboardedSelector = createSelector(
  swapsStateSelector,
  (swapsState) => swapsState.hasOnboarded,
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
