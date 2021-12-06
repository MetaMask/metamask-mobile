import { createSelector } from 'reselect';
import { isMainnetByChainId } from '../../util/networks';

const addressSelector = (state) => state.engine.backgroundState.PreferencesController.selectedAddress;
const chainIdSelector = (state) => state.engine.backgroundState.NetworkController.provider.chainId;

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
