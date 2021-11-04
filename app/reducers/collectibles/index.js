import { createSelector } from 'reselect';

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

const initialState = {
	favorites: {},
};

const fiatOrderReducer = (state = initialState, action) => {
	switch (action.type) {
		default: {
			return state;
		}
	}
};

export default fiatOrderReducer;
