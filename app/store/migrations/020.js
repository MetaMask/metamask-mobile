import { cloneDeep } from 'lodash';
import { v4 } from 'uuid';

export const version = 20;

/**
 * Migrate network configuration from Preferences controller to Network controller.
 * See this changelog for details: https://github.com/MetaMask/core/releases/tag/v44.0.0
 * 
 * Note: the type is wrong here because it conflicts with `redux-persist`
 * types, due to a bug in that package.
 * See: https://github.com/rt2zz/redux-persist/issues/1065
 * TODO: Use `unknown` as the state type, and silence or work around the
 * redux-persist bug somehow.
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
  const preferencesControllerState =
    state.engine.backgroundState.PreferencesController;
  const networkControllerState =
    state.engine.backgroundState.NetworkController;
  const frequentRpcList = preferencesControllerState?.frequentRpcList;
  if (networkControllerState && frequentRpcList?.length) {
    const networkConfigurations = frequentRpcList.reduce(
      (networkConfigs, networkConfig) => {
        const networkConfigurationId = v4();
        return {
          ...networkConfigs,
          [networkConfigurationId]: {
            ...networkConfig,
            // Explicitly convert number chain IDs to decimal strings
            // Likely we've only ever used string chain IDs here, but this
            // is a precaution because the type describes it as a number.
            chainId: String(networkConfig.chainId),
          },
        };
      },
      {},
    );
    delete preferencesControllerState.frequentRpcList;

    networkControllerState.networkConfigurations = networkConfigurations;
  }
  return state;
}
