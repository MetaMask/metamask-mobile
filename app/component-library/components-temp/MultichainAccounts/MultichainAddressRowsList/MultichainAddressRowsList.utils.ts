import { InternalAccount } from '@metamask/keyring-internal-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope, BtcScope, TrxScope, XlmScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { TEST_NETWORK_IDS } from '../../../../constants/network';
import { PopularList } from '../../../../util/networks/customNetworks';
import { getHexEvmChainId } from '../../../../util/networks';
import { toFormattedAddress } from '../../../../util/address';

export interface NetworkAddressItem {
  chainId: CaipChainId;
  networkName: string;
  address: string;
}

/**
 * Hex EVM chain id for comparisons (CHAIN_IDS, PopularList, testnets), or the
 * original CAIP id for non-EVM. Uses shared {@link getHexEvmChainId}.
 */
const evmHexOrOriginalChainId = (chainId: CaipChainId): string =>
  getHexEvmChainId(chainId) ?? chainId;

/**
 * Gets priority score for sorting networks (lower = higher priority)
 *
 * @param chainId - Chain ID (can be hex or CAIP format)
 * @returns Priority score
 */
export const getNetworkPriority = (chainId: CaipChainId): number => {
  const hexChainId = evmHexOrOriginalChainId(chainId);

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
  if (chainId === XlmScope.Pubnet) {
    return 4;
  } // Stellar fifth
  if (hexChainId === CHAIN_IDS.LINEA_MAINNET) {
    return 5;
  } // Linea sixth
  if (
    TEST_NETWORK_IDS.includes(hexChainId as (typeof TEST_NETWORK_IDS)[number])
  ) {
    return 8;
  } // Test networks last

  // Featured networks (popular networks)
  const popularChainIds = PopularList.map((network) => network.chainId);
  if (popularChainIds.includes(hexChainId as `0x${string}`)) {
    return 6;
  }

  return 7; // Other custom networks
};

/**
 * Sorts network address items according to priority:
 * 1. Ethereum, 2. Bitcoin, 3. Solana, 4. Tron, 5. Stellar, 6. Linea, 7. Featured networks, 8. Other custom networks, 9. Test networks last
 *
 * @param items - Array of NetworkAddressItem objects to sort
 * @returns Sorted array of NetworkAddressItem objects
 */
/**
 * Compares two networks by wallet display priority, then by name.
 * Test networks sort after mainnets / popular / custom networks.
 *
 * @param a - First network (chain id + display name)
 * @param b - Second network (chain id + display name)
 * @returns Negative if `a` should come first, positive if `b` should, else 0
 */
export const compareNetworksByPriority = (
  a: { chainId: CaipChainId; name: string },
  b: { chainId: CaipChainId; name: string },
): number => {
  const priorityDiff =
    getNetworkPriority(a.chainId) - getNetworkPriority(b.chainId);
  return priorityDiff === 0 ? a.name.localeCompare(b.name) : priorityDiff;
};

export const sortNetworkAddressItems = (
  items: NetworkAddressItem[],
): NetworkAddressItem[] =>
  [...items].sort((a, b) =>
    compareNetworksByPriority(
      { chainId: a.chainId, name: a.networkName },
      { chainId: b.chainId, name: b.networkName },
    ),
  );

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
