import { CaipChainId, isCaipChainId, toCaipChainId } from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { store } from '../../../store';

/**
 * Gets an array of chain IDs including both the configured networks and the provided chain ID.
 * @param chainId - The chain ID to append to the list of configured networks.
 * @returns An array of CAIP chain IDs containing both the configured networks and the provided chain ID.
 */
export function getNetworksConfigured(
  chainId: CaipChainId | string,
): CaipChainId[] {
  const reduxState = store.getState();

  const _chainId = isCaipChainId(chainId)
    ? chainId
    : toCaipChainId('eip155', chainId);

  const networks = selectNetworkConfigurations(reduxState);
  const chainIds = Object.values(networks).map((n) => n.chainId);

  return [...chainIds, _chainId];
}
