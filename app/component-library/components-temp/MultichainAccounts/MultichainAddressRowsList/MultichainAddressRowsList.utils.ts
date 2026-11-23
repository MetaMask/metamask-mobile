import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SolScope, BtcScope, TrxScope, XlmScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';
import { TEST_NETWORK_IDS } from '../../../../constants/network';
import { PopularList } from '../../../../util/networks/customNetworks';
import { getHexEvmChainId } from '../../../../util/networks';

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
const getNetworkPriority = (chainId: CaipChainId): number => {
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
