import {
  CaipChainId,
  isCaipChainId,
  toCaipChainId,
  isHexString,
} from '@metamask/utils';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { store } from '../../../store';
import { UserProfileProperty } from '../UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { convertHexToDecimal } from '@metamask/controller-utils';

/**
 * Converts a chain ID to CAIP format.
 * @param chainId - The chain ID to convert, either as a CAIP chain ID or string.
 * @returns The chain ID in CAIP format.
 */
function caipifyChainId(chainId: CaipChainId | string): CaipChainId {
  const _chainId = isHexString(chainId)
    ? convertHexToDecimal(chainId)
    : chainId;

  //For Non-EVM chains, the chainId should already be in CAIP format. For EVM chains, we convert to CAIP by adding the 'eip155' namespace
  return isCaipChainId(_chainId)
    ? _chainId
    : toCaipChainId('eip155', _chainId.toString());
}

/**
 * Gets an array of all configured network chain IDs converted to CAIP format.
 * @returns An array of CAIP chain IDs for all configured networks.
 */
export function getConfiguredChainIdsCaipified(): CaipChainId[] {
  const reduxState = store.getState();
  const networks = selectNetworkConfigurations(reduxState);

  return Object.values(networks).map((n) => caipifyChainId(n.chainId));
}

/**
 * Gets an array of chain IDs including both the configured networks and the provided chain ID.
 * @param chainId - The chain ID to append to the list of configured networks.
 * @returns An array of CAIP chain IDs containing both the configured networks and the provided chain ID.
 */
export function getChainIdListProperty(chainId: CaipChainId | string): {
  [UserProfileProperty.CHAIN_IDS]: CaipChainId[];
} {
  const caipChainId = caipifyChainId(chainId);
  const chainIds = getConfiguredChainIdsCaipified();

  return {
    [UserProfileProperty.CHAIN_IDS]: [...chainIds, caipChainId],
  };
}

/**
 * Gets an array of chain IDs excluding the provided chain ID from the configured networks.
 * @param chainId - The chain ID to remove from the list of configured networks.
 * @returns An array of CAIP chain IDs containing the configured networks without the provided chain ID.
 */
export function getChainIdListPropertyWithout(chainId: CaipChainId | string): {
  [UserProfileProperty.CHAIN_IDS]: CaipChainId[];
} {
  const caipChainId = caipifyChainId(chainId);

  const chainIds = getConfiguredChainIdsCaipified().filter(
    (id) => id !== caipChainId,
  );

  return {
    [UserProfileProperty.CHAIN_IDS]: chainIds,
  };
}
