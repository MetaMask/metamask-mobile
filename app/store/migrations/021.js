import { cloneDeep } from 'lodash';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../app/constants/network';

export const version = 21;

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
  const outdatedIpfsGateways = [
    'https://hardbin.com/ipfs/',
    'https://ipfs.greyh.at/ipfs/',
    'https://ipfs.fooock.com/ipfs/',
    'https://cdn.cwinfo.net/ipfs/',
  ];

  const isUsingOutdatedGateway = outdatedIpfsGateways.includes(
    state.engine.backgroundState?.PreferencesController?.ipfsGateway,
  );

  if (isUsingOutdatedGateway) {
    state.engine.backgroundState.PreferencesController.ipfsGateway =
      IPFS_DEFAULT_GATEWAY_URL;
  }
  return state;
}
