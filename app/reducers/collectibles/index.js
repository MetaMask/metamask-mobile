import { createSelector } from 'reselect';
import { KnownCaipNamespace } from '@metamask/utils';
import { selectChainId } from '../../selectors/networkController';
import {
  selectAllNftContracts,
  selectAllNfts,
} from '../../selectors/nftController';
import { selectSelectedInternalAccountAddress } from '../../selectors/accountsController';
import { compareTokenIds } from '../../util/tokens';
import { createDeepEqualSelector } from '../../selectors/util';
import { selectEnabledNetworksByNamespace } from '../../selectors/networkEnablementController';

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

export const multichainCollectibleContractsSelector = createSelector(
  selectSelectedInternalAccountAddress,
  selectAllNftContracts,
  (address, allNftContracts) => allNftContracts[address] || {},
);

export const multichainCollectibleContractsByEnabledNetworksSelector =
  createDeepEqualSelector(
    selectSelectedInternalAccountAddress,
    selectAllNftContracts,
    selectEnabledNetworksByNamespace,
    (address, allNftContracts, enabledNetworks) => {
      const addressContracts = allNftContracts[address];

      if (!addressContracts || Object.keys(addressContracts).length === 0) {
        return {};
      }

      const enabledNetworksForEip155 =
        enabledNetworks?.[KnownCaipNamespace.Eip155] || {};

      if (
        !enabledNetworksForEip155 ||
        Object.keys(enabledNetworksForEip155).length === 0
      ) {
        return {};
      }

      const enabledChainIds = Object.keys(enabledNetworksForEip155).filter(
        (chainId) => enabledNetworksForEip155[chainId],
      );

      if (enabledChainIds.length === 0) {
        return {};
      }

      return enabledChainIds.reduce((acc, chainId) => {
        acc[chainId] = addressContracts[chainId] || [];
        return acc;
      }, {});
    },
  );

export const collectiblesSelector = createDeepEqualSelector(
  selectSelectedInternalAccountAddress,
  selectChainId,
  selectAllNfts,
  (address, chainId, allNfts) => allNfts[address]?.[chainId] || [],
);

export const multichainCollectiblesSelector = createDeepEqualSelector(
  selectSelectedInternalAccountAddress,
  selectAllNfts,
  (address, allNfts) => allNfts[address] || {},
);

export const multichainCollectiblesByEnabledNetworksSelector =
  createDeepEqualSelector(
    selectSelectedInternalAccountAddress,
    selectAllNfts,
    selectEnabledNetworksByNamespace,
    (address, allNfts, enabledNetworks) => {
      const addressNfts = allNfts[address];

      if (!addressNfts || Object.keys(addressNfts).length === 0) {
        return {};
      }

      const enabledNetworksForEip155 =
        enabledNetworks?.[KnownCaipNamespace.Eip155] || {};

      if (
        !enabledNetworksForEip155 ||
        Object.keys(enabledNetworksForEip155).length === 0
      ) {
        return {};
      }

      const enabledChainIds = Object.keys(enabledNetworksForEip155).filter(
        (chainId) => enabledNetworksForEip155[chainId],
      );

      if (enabledChainIds.length === 0) {
        return {};
      }

      const enabledChainIdsSet = new Set(enabledChainIds);

      return Object.keys(addressNfts)
        .filter((chainId) => enabledChainIdsSet.has(chainId))
        .reduce((acc, chainId) => {
          acc[chainId] = addressNfts[chainId];
          return acc;
        }, {});
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
