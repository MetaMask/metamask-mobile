import { createSelector } from 'reselect';

const addressSelector = (state) => state.engine.backgroundState.PreferencesController.selectedAddress;
const chainIdSelector = (state) => state.engine.backgroundState.NetworkController.provider.chainId;

const allCollectibleContractsSelector = (state) =>
	state.engine.backgroundState.CollectiblesController.allCollectibleContracts;
const allCollectiblesSelector = (state) => state.engine.backgroundState.CollectiblesController.allCollectibles;

export const collectibleContractsSelector = createSelector(
	addressSelector,
	chainIdSelector,
	allCollectibleContractsSelector,
	(address, chainId, allCollectibleContracts) => allCollectibleContracts[address]?.[chainId] || []
);

export const collectiblesSelector = createSelector(
	addressSelector,
	chainIdSelector,
	allCollectiblesSelector,
	(address, chainId, allCollectibles) => allCollectibles[address]?.[chainId] || []
);

const initialState = {
	favorites: {},
};

const collectiblesFavoritesReducer = (state = initialState, action) => {
	switch (action.type) {
		default: {
			return state;
		}
	}
};

export default collectiblesFavoritesReducer;
