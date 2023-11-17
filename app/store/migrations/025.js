import { cloneDeep } from 'lodash';

export const version = 25;

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
  try {
    Object.values(ETHERSCAN_SUPPORTED_CHAIN_IDS).forEach((hexChainId) => {
      const thirdPartyApiMode = state?.privacy?.thirdPartyApiMode ?? true;
      if (
        state?.engine?.backgroundState?.PreferencesController
          ?.showIncomingTransactions
      ) {
        state.engine.backgroundState.PreferencesController.showIncomingTransactions =
          {
            ...state.engine.backgroundState.PreferencesController
              .showIncomingTransactions,
            [hexChainId]: thirdPartyApiMode,
          };
      } else if (state?.engine?.backgroundState?.PreferencesController) {
        state.engine.backgroundState.PreferencesController.showIncomingTransactions =
          { [hexChainId]: thirdPartyApiMode };
      }
    });

    if (state?.privacy?.thirdPartyApiMode !== undefined) {
      delete state.privacy.thirdPartyApiMode;
    }

    return state;
  } catch (e) {
    return state;
  }
}
