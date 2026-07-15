import { toHex } from '@metamask/controller-utils';
import { createSelector } from 'reselect';
import { selectChainId } from '../../selectors/networkController';
import {
  selectAllNftContracts,
  selectAllNfts,
} from '../../selectors/nftController';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { compareTokenIds } from '../../util/tokens';
import { createDeepEqualSelector } from '../../selectors/util';
import { selectEnabledNetworksByNamespace } from '../../selectors/networkEnablementController';

/**
 * Builds a set of chain IDs for filtering. When chainIds include CAIP-2 (e.g. from listPopularNetworks),
 * adds Hex form for eip155:* so we match NFT keys which are Hex.
 * @param {string[]} chainIds - CAIP-2 or Hex chain IDs
 * @returns {Set<string>}
 */
function buildAllowedChainIdSet(chainIds) {
  const set = new Set(chainIds);
  for (const id of chainIds) {
    if (id.startsWith('eip155:')) {
      const reference = id.slice(7);
      if (reference) set.add(toHex(reference));
    }
  }
  return set;
}

const favoritesSelector = (state) => state.collectibles.favorites;

export const isNftFetchingProgressSelector = (state) =>
  state.collectibles.isNftFetchingProgress;

export const collectibleContractsSelector = createSelector(
  selectSelectedInternalAccountAddress,
  selectChainId,
  selectAllNftContracts,
  (address, chainId, allNftContracts) =>
    allNftContracts[address]?.[chainId] || [],
);

/**
 * @deprecated - this does not return all collectibles if multiple networks are selected
 */
export const collectiblesSelector = createDeepEqualSelector(
  selectSelectedInternalAccountAddress,
  selectChainId,
  selectAllNfts,
  (address, chainId, allNfts) => allNfts[address]?.[chainId] || [],
);

/**
 * Multichain collectibles filtered by chain IDs. When addressesOverride is passed (e.g. all
 * addresses in the selected account group), aggregates NFTs from those addresses so that when
 * Solana is selected we still include NFTs keyed by EVM address. When preferredChainIds is
 * passed (e.g. from listPopularNetworks()), uses that list; otherwise falls back to
 * selectEnabledNetworksByNamespace.
 * @param {object} state - Redux state
 * @param {string[]} [preferredChainIds] - Optional chain IDs (CAIP-2 or Hex) to filter by; when omitted, uses enabled networks
 * @param {string[]} [addressesOverride] - Optional list of addresses to aggregate NFTs from; when omitted, uses selected account address only
 */
export const multichainCollectiblesByEnabledNetworksSelector =
  createDeepEqualSelector(
    [
      selectSelectedInternalAccountAddress,
      selectAllNfts,
      selectEnabledNetworksByNamespace,
      (state, preferredChainIds) => preferredChainIds,
      (state, _preferredChainIds, addressesOverride) => addressesOverride,
    ],
    (
      selectedAddress,
      allNfts,
      enabledNetworks,
      preferredChainIds,
      addressesOverride,
    ) => {
      const addresses =
        addressesOverride != null &&
        Array.isArray(addressesOverride) &&
        addressesOverride.length > 0
          ? addressesOverride
          : selectedAddress
            ? [selectedAddress]
            : [];

      let allowedChainIdsSet;

      if (
        preferredChainIds != null &&
        Array.isArray(preferredChainIds) &&
        preferredChainIds.length > 0
      ) {
        allowedChainIdsSet = buildAllowedChainIdSet(preferredChainIds);
      } else {
        const enabledChainIds = [];
        for (const namespace of Object.keys(enabledNetworks || {})) {
          const networkMap = enabledNetworks[namespace] || {};
          for (const chainId of Object.keys(networkMap)) {
            if (networkMap[chainId]) enabledChainIds.push(chainId);
          }
        }

        if (enabledChainIds.length === 0) {
          return {};
        }

        allowedChainIdsSet = new Set(enabledChainIds);
      }

      const result = {};
      for (const address of addresses) {
        const addressNfts = allNfts?.[address];
        if (!addressNfts) continue;
        for (const chainId of Object.keys(addressNfts)) {
          if (!allowedChainIdsSet.has(chainId)) continue;
          const nfts = addressNfts[chainId];
          if (!Array.isArray(nfts)) continue;
          result[chainId] = (result[chainId] || []).concat(nfts);
        }
      }

      return result;
    },
  );

export const favoritesCollectiblesSelector = createSelector(
  selectSelectedInternalAccountAddress,
  selectChainId,
  favoritesSelector,
  (address, chainId, favorites) => favorites[address]?.[chainId] || [],
);

export const isCollectibleInFavoritesSelector = createSelector(
  favoritesCollectiblesSelector,
  (state, collectible) => collectible,
  (favoriteCollectibles, collectible) =>
    Boolean(
      favoriteCollectibles.find(
        ({ tokenId, address }) =>
          // TO DO: Remove after moving favorites to controllers.
          compareTokenIds(tokenId, collectible.tokenId) &&
          address === collectible.address,
      ),
    ),
);

const getFavoritesCollectibles = (
  favoriteCollectibles,
  selectedAddress,
  chainId,
) => favoriteCollectibles[selectedAddress]?.[chainId] || [];

export const ADD_FAVORITE_COLLECTIBLE = 'ADD_FAVORITE_COLLECTIBLE';
export const REMOVE_FAVORITE_COLLECTIBLE = 'REMOVE_FAVORITE_COLLECTIBLE';
export const SHOW_NFT_FETCHING_LOADER = 'SHOW_NFT_FETCHING_LOADER';
export const HIDE_NFT_FETCHING_LOADER = 'HIDE_NFT_FETCHING_LOADER';

const initialState = {
  favorites: {},
  isNftFetchingProgress: false,
};

const collectiblesFavoritesReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_FAVORITE_COLLECTIBLE: {
      const { selectedAddress, chainId, collectible } = action;
      const collectibles = getFavoritesCollectibles(
        state.favorites,
        selectedAddress,
        chainId,
      );
      collectibles.push({
        tokenId: collectible.tokenId,
        address: collectible.address,
      });
      const selectedAddressCollectibles =
        state.favorites[selectedAddress] || [];
      return {
        ...state,
        favorites: {
          ...state.favorites,
          [selectedAddress]: {
            ...selectedAddressCollectibles,
            [chainId]: collectibles.slice(),
          },
        },
      };
    }
    case REMOVE_FAVORITE_COLLECTIBLE: {
      const { selectedAddress, chainId, collectible } = action;
      const collectibles = getFavoritesCollectibles(
        state.favorites,
        selectedAddress,
        chainId,
      );
      const indexToRemove = collectibles.findIndex(
        ({ tokenId, address }) =>
          // TO DO: Remove after moving favorites to controllers.
          compareTokenIds(tokenId, collectible.tokenId) &&
          address === collectible.address,
      );
      collectibles.splice(indexToRemove, 1);
      const selectedAddressCollectibles =
        state.favorites[selectedAddress] || [];
      return {
        ...state,
        favorites: {
          ...state.favorites,
          [selectedAddress]: {
            ...selectedAddressCollectibles,
            [chainId]: collectibles.slice(),
          },
        },
      };
    }
    case SHOW_NFT_FETCHING_LOADER: {
      return {
        ...state,
        isNftFetchingProgress: true,
      };
    }
    case HIDE_NFT_FETCHING_LOADER: {
      return {
        ...state,
        isNftFetchingProgress: false,
      };
    }
    default: {
      return state;
    }
  }
};

export const showNftFetchingLoadingIndicator = () => ({
  type: SHOW_NFT_FETCHING_LOADER,
});

export const hideNftFetchingLoadingIndicator = () => ({
  type: HIDE_NFT_FETCHING_LOADER,
});

export default collectiblesFavoritesReducer;
