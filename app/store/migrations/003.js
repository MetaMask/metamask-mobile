import { cloneDeep } from 'lodash';
import { NetworksChainId } from '@metamask/controller-utils';
import { isSafeChainId } from '../util/networks';
import { GOERLI } from '../../app/constants/network';
import { regex } from '../../app/util/regex';

export const version = 3;

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
  const provider = state.engine.backgroundState.NetworkController.provider;
  const chainId = NetworksChainId[provider.type];
  // if chainId === '' is a rpc
  if (chainId) {
    state.engine.backgroundState.NetworkController.provider = {
      ...provider,
      chainId,
    };
    return state;
  }

  // If provider is rpc, check if the current network has a valid chainId
  const storedChainId =
    typeof provider.chainId === 'string' ? provider.chainId : '';
  const isDecimalString = regex.decimalStringMigrations.test(storedChainId);
  const hasInvalidChainId =
    !isDecimalString || !isSafeChainId(parseInt(storedChainId, 10));

  if (hasInvalidChainId) {
    // If the current network does not have a chainId, switch to testnet.
    state.engine.backgroundState.NetworkController.provider = {
      ticker: 'ETH',
      type: GOERLI,
      chainId: NetworksChainId.goerli,
    };
  }
  return state;
}
