import { createSelector } from 'reselect';
import { compareTokenIds } from '../../util/tokens';

const getFavoritesCollectibles = (favoriteCollectibles, selectedAddress, chainId) =>
	favoriteCollectibles[selectedAddress]?.[chainId] || [];

export const favoritesCollectiblesSelector = (state) => {
	const favoriteCollectibles = state.collectibles.favorites;
	const selectedAddress = state.engine.backgroundState.PreferencesController.selectedAddress;
	const chainId = state.engine.backgroundState.NetworkController.provider.chainId;
	return favoriteCollectibles[selectedAddress]?.[chainId] || [];
};

export const favoritesCollectiblesObjectSelector = createSelector(
	favoritesCollectiblesSelector,
	(favoriteCollectibles) => favoriteCollectibles
);

export const isCollectibleInFavorites = (favoriteCollectibles, collectible) =>
	Boolean(
		favoriteCollectibles.find(
			({ tokenId, address }) =>
				// TO DO: Remove after moving favorites to controllers.
				compareTokenIds(tokenId, collectible.tokenId) && address === collectible.address
		)
	);

export const ADD_FAVORITE_COLLECTIBLE = 'ADD_FAVORITE_COLLECTIBLE';
export const REMOVE_FAVORITE_COLLECTIBLE = 'REMOVE_FAVORITE_COLLECTIBLE';

const initialState = {
	favorites: {},
};

const fiatOrderReducer = (state = initialState, action) => {
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

export default fiatOrderReducer;
