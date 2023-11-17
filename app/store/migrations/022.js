import { cloneDeep } from 'lodash';

export const version = 22;

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
  if (state?.engine?.backgroundState?.PreferencesController?.openSeaEnabled) {
    state.engine.backgroundState.PreferencesController.displayNftMedia =
      state.engine.backgroundState.PreferencesController.openSeaEnabled ??
      true;

    delete state.engine.backgroundState.PreferencesController.openSeaEnabled;
  }
  if (state?.user?.nftDetectionDismissed) {
    delete state.user.nftDetectionDismissed;
  }

  return state;
}
