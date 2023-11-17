import { cloneDeep } from 'lodash';

export const version = 5;

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
  state.engine.backgroundState.TokensController = {
    allTokens: state.engine.backgroundState.AssetsController.allTokens,
    ignoredTokens:
      state.engine.backgroundState.AssetsController.ignoredTokens,
  };

  state.engine.backgroundState.CollectiblesController = {
    allCollectibles:
      state.engine.backgroundState.AssetsController.allCollectibles,
    allCollectibleContracts:
      state.engine.backgroundState.AssetsController.allCollectibleContracts,
    ignoredCollectibles:
      state.engine.backgroundState.AssetsController.ignoredCollectibles,
  };

  delete state.engine.backgroundState.AssetsController;

  return state;
}
