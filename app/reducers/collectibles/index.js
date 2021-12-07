import { createSelector } from 'reselect';
import { compareTokenIds } from '../../util/tokens';
import { isMainnetByChainId } from '../../util/networks';

const addressSelector = (state) => state.engine.backgroundState.PreferencesController.selectedAddress;
const chainIdSelector = (state) => state.engine.backgroundState.NetworkController.provider.chainId;
const favoritesSelector = (state) => state.collectibles.favorites;

const allCollectibleContractsSelector = (state) =>
	state.engine.backgroundState.CollectiblesController.allCollectibleContracts;
const allCollectiblesSelector = (state) => state.engine.backgroundState.CollectiblesController.allCollectibles;

export const collectibleContractsSelector = createSelector(
	addressSelector,
	chainIdSelector,
	allCollectibleContractsSelector,
	(address, chainId, allCollectibleContracts) => {
		const contracts = allCollectibleContracts[address]?.[chainId] || [];
		if (isMainnetByChainId(chainId)) {
			return contracts.filter(({ logo }) => logo);
		}
		return contracts;
	}
);

export const collectiblesSelector = createSelector(
	addressSelector,
	chainIdSelector,
	allCollectiblesSelector,
	(address, chainId, allCollectibles) => allCollectibles[address]?.[chainId] || []
);

export const favoritesCollectiblesSelector = createSelector(
	addressSelector,
	chainIdSelector,
	favoritesSelector,
	(address, chainId, favorites) => favorites[address]?.[chainId] || []
);

export const isCollectibleInFavoritesSelector = createSelector(
	favoritesCollectiblesSelector,
	(state, collectible) => collectible,
	(favoriteCollectibles, collectible) =>
		Boolean(
			favoriteCollectibles.find(
				({ tokenId, address }) =>
					// TO DO: Remove after moving favorites to controllers.
					compareTokenIds(tokenId, collectible.tokenId) && address === collectible.address
			)
		)
);

const getFavoritesCollectibles = (favoriteCollectibles, selectedAddress, chainId) =>
	favoriteCollectibles[selectedAddress]?.[chainId] || [];

export const ADD_FAVORITE_COLLECTIBLE = 'ADD_FAVORITE_COLLECTIBLE';
export const REMOVE_FAVORITE_COLLECTIBLE = 'REMOVE_FAVORITE_COLLECTIBLE';

const initialState = {
	favorites: {},
};

const collectiblesFavoritesReducer = (state = initialState, action) => {
	switch (action.type) {
		case ADD_FAVORITE_COLLECTIBLE: {
			const { selectedAddress, chainId, collectible } = action;
			const collectibles = getFavoritesCollectibles(state.favorites, selectedAddress, chainId);
			collectibles.push({ tokenId: collectible.tokenId, address: collectible.address });
			const selectedAddressCollectibles = state.favorites[selectedAddress] || [];
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
			const collectibles = getFavoritesCollectibles(state.favorites, selectedAddress, chainId);
			const indexToRemove = collectibles.findIndex(
				({ tokenId, address }) =>
					// TO DO: Remove after moving favorites to controllers.
					compareTokenIds(tokenId, collectible.tokenId) && address === collectible.address
			);
			collectibles.splice(indexToRemove, 1);
			const selectedAddressCollectibles = state.favorites[selectedAddress] || [];
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
		default: {
			return state;
		}
	}
};

export default collectiblesFavoritesReducer;
