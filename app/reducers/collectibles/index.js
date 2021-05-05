export const getFavoritesCollectibles = (collectibles, selectedAddress, chainId) =>
	collectibles[selectedAddress]?.[chainId] || [];

export const isCollectibleInFavorites = (collectibles, selectedAddress, chainId, collectible) =>
	collectibles[selectedAddress]?.[chainId]?.find(
		({ tokenId, address }) => collectible.tokenId === tokenId && collectible.address === address
	);

export const ADD_FAVORITE_COLLECTIBLE = 'ADD_FAVORITE_COLLECTIBLE';
export const REMOVE_FAVORITE_COLLECTIBLE = 'REMOVE_FAVORITE_COLLECTIBLE';

const initialState = {
	favorites: {}
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
						[chainId]: collectibles.slice()
					}
				}
			};
		}
		case REMOVE_FAVORITE_COLLECTIBLE: {
			const { selectedAddress, chainId, collectible } = action;
			const collectibles = getFavoritesCollectibles(state.favorites, selectedAddress, chainId);
			const indexToRemove = collectibles.findIndex(
				({ tokenId, address }) => tokenId === collectible.tokenId && address === collectible.address
			);
			collectibles.splice(indexToRemove, 1);
			const selectedAddressCollectibles = state.favorites[selectedAddress] || [];
			return {
				...state,
				favorites: {
					...state.favorites,
					[selectedAddress]: {
						...selectedAddressCollectibles,
						[chainId]: collectibles.slice()
					}
				}
			};
		}
		default: {
			return state;
		}
	}
};

export default fiatOrderReducer;
