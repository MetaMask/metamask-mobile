import { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope, BtcScope, TrxScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { TEST_NETWORK_IDS } from '../../../../constants/network';
import { PopularList } from '../../../../util/networks/customNetworks';
import { toFormattedAddress } from '../../../../util/address';

export interface NetworkAddressItem {
  chainId: CaipChainId;
  networkName: string;
  address: string;
}

/**
 * Extracts hex chain ID from CAIP chain ID format for EVM networks
 * @param chainId - Chain ID (can be hex or CAIP format)
 * @returns Hex chain ID for EVM networks, original for non-EVM
 */
const extractHexChainId = (chainId: CaipChainId): string => {
  if (chainId.startsWith('eip155:')) {
    const chainIdPart = chainId.split(':')[1];
    // Convert decimal to hex format if needed (CAIP format uses decimal)
    if (!chainIdPart.startsWith('0x')) {
      return `0x${parseInt(chainIdPart, 10).toString(16)}`;
    }
    return chainIdPart;
  }
  return chainId;
};

/**
 * Gets priority score for sorting networks (lower = higher priority)
 *
 * @param chainId - Chain ID (can be hex or CAIP format)
 * @returns Priority score
 */
const getNetworkPriority = (chainId: CaipChainId): number => {
  // For EVM networks, extract hex chain ID for comparison
  const hexChainId = extractHexChainId(chainId);

  // Hardcoded order for top networks
  if (hexChainId === CHAIN_IDS.MAINNET) {
    return 0;
  } // Ethereum first
  if (chainId === BtcScope.Mainnet) {
    return 1;
  } // Bitcoin second
  if (chainId === SolScope.Mainnet) {
    return 2;
  } // Solana third
  if (chainId === TrxScope.Mainnet) {
    return 3;
  } // Tron fourth
  if (hexChainId === CHAIN_IDS.LINEA_MAINNET) {
    return 4;
  } // Linea fifth
  if (
    TEST_NETWORK_IDS.includes(hexChainId as (typeof TEST_NETWORK_IDS)[number])
  ) {
    return 7;
  } // Test networks last

  // Featured networks (popular networks)
  const popularChainIds = PopularList.map((network) => network.chainId);
  if (popularChainIds.includes(hexChainId as `0x${string}`)) {
    return 5;
  }

  return 6; // Other custom networks
};

/**
 * Sorts network address items according to priority:
 * 1. Ethereum, 2. Bitcoin, 3. Solana, 4. Tron, 5. Linea, 6. Featured networks, 7. Other custom networks, 8. Test networks last
 *
 * @param items - Array of NetworkAddressItem objects to sort
 * @returns Sorted array of NetworkAddressItem objects
 */
export const sortNetworkAddressItems = (
  items: NetworkAddressItem[],
): NetworkAddressItem[] =>
  items.sort((a, b) => {
    const priorityDiff =
      getNetworkPriority(a.chainId) - getNetworkPriority(b.chainId);
    return priorityDiff === 0
      ? a.networkName.localeCompare(b.networkName)
      : priorityDiff;
  });

/**
 * Creates a NetworkAddressItem from chain ID, network config, and address
 * Ensures addresses are properly formatted: checksummed for EVM, raw for non-EVM
 *
 * @param chainId - Chain ID
 * @param network - Network configuration
 * @param network.name - Network name
 * @param network.chainId - Network chain ID
 * @param address - Address to associate with the network
 * @returns NetworkAddressItem object with properly formatted address
 */
const createNetworkAddressItem = (
  chainId: CaipChainId,
  network: { name: string; chainId: CaipChainId },
  address: string,
): NetworkAddressItem => ({
  chainId,
  networkName: network.name,
  address: toFormattedAddress(address),
});

/**
 * Gets compatible networks for an InternalAccount based on its scopes
 *
 * @param account - InternalAccount object to get compatible networks for
 * @param allNetworks - Record of all network configurations
 * @returns Array of NetworkAddressItem objects
 */
export const getCompatibleNetworksForAccount = (
  account: InternalAccount,
  allNetworks: Record<CaipChainId, { name: string; chainId: CaipChainId }>,
): NetworkAddressItem[] => {
  if (!account.scopes?.length) {
    return [];
  }

  const compatibleItems: NetworkAddressItem[] = [];

  account.scopes.forEach((scope: CaipChainId) => {
    if (scope.includes(':*') || scope.endsWith(':0')) {
      // Wildcard scope - add all networks for this namespace
      const namespace = scope.split(':')[0];
      Object.entries(allNetworks).forEach(([chainId, network]) => {
        if (chainId.split(':')[0] === namespace) {
          compatibleItems.push(
            createNetworkAddressItem(
              chainId as CaipChainId,
              network,
              account.address,
            ),
          );
        }
      });
    } else {
      // Specific network scope
      const network = allNetworks[scope];
      if (network) {
        compatibleItems.push(
          createNetworkAddressItem(scope, network, account.address),
        );
      }
    }
  });

  return compatibleItems;
};
