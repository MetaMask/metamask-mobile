import { cloneDeep } from 'lodash';
import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export const version = 24;

/**
 * Migrate NetworkController state, splitting old `network` property into
 * `networkId` and `networkStatus`. This is required to update to v8 of the
 * NetworkController package.
 * 
 * @see {@link https://github.com/MetaMask/core/blob/main/packages/network-controller/CHANGELOG.md#800}
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
  const networkControllerState =
    state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 24: Invalid network controller state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  } else if (typeof networkControllerState.network !== 'string') {
    captureException(
      new Error(
        `Migration 24: Invalid network state: '${typeof networkControllerState.network}'`,
      ),
    );
    return state;
  }

  if (networkControllerState.network === 'loading') {
    networkControllerState.networkId = null;
    networkControllerState.networkStatus = NetworkStatus.Unknown;
  } else {
    networkControllerState.networkId = networkControllerState.network;
    networkControllerState.networkStatus = NetworkStatus.Available;
  }
  delete networkControllerState.network;

  return state;
}
