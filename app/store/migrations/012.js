import { cloneDeep } from 'lodash';

export const version = 12;

/**
 * 
 *
 * @param originalVersionedData - Versioned MetaMask extension state, exactly what we persist to dist.
 * @param originalVersionedData.meta - State metadata.
 * @param originalVersionedData.meta.version - The current state version.
 * @param originalVersionedData.data - The persisted MetaMask state, keyed by controller.
 * @returns Updated versioned MetaMask extension state.
 */
export function migrate(originalVersionedData) {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  versionedData.data = transformState(versionedData.data);
  return versionedData;
}

function transformState(state) {
  const {
    allCollectibles,
    allCollectibleContracts,
    ignoredCollectibles,
    ...unexpectedCollectiblesControllerState
  } = state.engine.backgroundState.CollectiblesController;
  state.engine.backgroundState.NftController = {
    ...unexpectedCollectiblesControllerState,
    allNfts: allCollectibles,
    allNftContracts: allCollectibleContracts,
    ignoredNfts: ignoredCollectibles,
  };
  delete state.engine.backgroundState.CollectiblesController;

  state.engine.backgroundState.NftDetectionController =
    state.engine.backgroundState.CollectibleDetectionController;
  delete state.engine.backgroundState.CollectibleDetectionController;

  state.engine.backgroundState.PreferencesController.useNftDetection =
    state.engine.backgroundState.PreferencesController.useCollectibleDetection;
  delete state.engine.backgroundState.PreferencesController
    .useCollectibleDetection;

  return state;
}
