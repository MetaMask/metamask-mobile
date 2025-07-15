import {
  CaipChainId,
  Hex,
  isCaipChainId,
  isHexString,
  toCaipChainId,
} from '@metamask/utils';
import { store } from '../../../store';
import { UserProfileProperty } from '../UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { NetworkConfiguration } from '@metamask/network-controller';

/**
 * Converts a chain ID to CAIP format.
 * @param chainId - The chain ID to convert, either as a CAIP chain ID or string.
 * @returns The chain ID in CAIP format.
 */
function caipifyChainId(chainId: CaipChainId | string): CaipChainId {
  //For Non-EVM chains, the chainId should already be in CAIP format.
  if (isCaipChainId(chainId)) {
    return chainId;
  }

  //If its not a hex string, we assume its a decimal chainId
  if (!isHexString(chainId)) {
    return toCaipChainId('eip155', chainId);
  }

  // For EVM chains, we convert to CAIP by adding the 'eip155' namespace
  return toEvmCaipChainId(chainId as Hex);
}

/**
 * Gets an array of all configured network chain IDs converted to CAIP format.
 * @returns An array of CAIP chain IDs for all configured networks.
 */
export function getConfiguredCaipChainIds(): CaipChainId[] {
  // We're accessing state with optional chaining here because there's a race condition
  // that causes redux state to be undefined when we access it.
  // Issue here: https://github.com/MetaMask/metamask-mobile/issues/17167

  const state = store.getState();
  const evmNetworkConfigurations =
    state?.engine?.backgroundState?.NetworkController
      ?.networkConfigurationsByChainId || {};

  const multichainNetworkController =
    state?.engine?.backgroundState?.MultichainNetworkController;

  const nonEvmNetworkConfigurations =
    multichainNetworkController?.multichainNetworkConfigurationsByChainId || {};

  const allNetworkConfigurations: Record<string, NetworkConfiguration> = {
    ...evmNetworkConfigurations,
    ...nonEvmNetworkConfigurations,
  };

  const chainIds = Object.values(allNetworkConfigurations)
    .filter((network) => network?.chainId)
    .map((network) => caipifyChainId(network.chainId));

  return chainIds;
}

/**
 * Gets an array of chain IDs including both the configured networks and the provided chain ID.
 * @param chainId - The chain ID to append to the list of configured networks.
 * @returns An array of CAIP chain IDs containing both the configured networks and the provided chain ID.
 */
export function addItemToChainIdList(chainId: CaipChainId | string): {
  [UserProfileProperty.CHAIN_IDS]: CaipChainId[];
} {
  const caipChainId = caipifyChainId(chainId);
  const chainIds = getConfiguredCaipChainIds();

  return {
    [UserProfileProperty.CHAIN_IDS]: [...chainIds, caipChainId],
  };
}

/**
 * Gets an array of chain IDs excluding the provided chain ID from the configured networks.
 * @param chainId - The chain ID to remove from the list of configured networks.
 * @returns An array of CAIP chain IDs containing the configured networks without the provided chain ID.
 */
export function removeItemFromChainIdList(chainId: CaipChainId | string): {
  [UserProfileProperty.CHAIN_IDS]: CaipChainId[];
} {
  const caipChainId = caipifyChainId(chainId);

  const chainIds = getConfiguredCaipChainIds().filter(
    (id) => id !== caipChainId,
  );

  return {
    [UserProfileProperty.CHAIN_IDS]: chainIds,
  };
}
