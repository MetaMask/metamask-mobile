import { useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { isCaipChainId, CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { toHex } from '@metamask/controller-utils';

/**
 * Hook that returns a function to get the human-readable network name for an aggregator order
 *
 * The returned function uses the following priority order:
 * 1. Network shortName from the order's cryptoCurrency
 * 2. Network name from network configurations (for custom/added networks)
 * 3. undefined if network information is not available
 *
 * Handles chain ID conversion:
 * - Leaves CAIP chain IDs as-is (e.g., "solana:...", "bip122:...")
 * - Converts hex chain IDs to CAIP format (e.g., "0x1" → "eip155:1")
 * - Converts decimal chain IDs to CAIP format (e.g., "137" → "eip155:137")
 *
 * @returns A function that takes an order and returns the network shortName or name
 */
export function useAggregatorOrderNetworkName() {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  return (order: Order | undefined): string | undefined => {
    // First priority: use shortName from order's network
    const shortName = order?.cryptoCurrency?.network?.shortName;
    if (shortName) {
      return shortName;
    }

    // Second priority: lookup in network configurations
    const chainId = order?.cryptoCurrency?.network?.chainId;
    if (!chainId) {
      return undefined;
    }

    let caipChainId: CaipChainId | undefined;

    try {
      if (isCaipChainId(chainId)) {
        // Already in CAIP format (e.g., "solana:...", "bip122:...", "eip155:...")
        caipChainId = chainId;
      } else if (chainId.startsWith('0x')) {
        // Hex format, convert to EVM CAIP
        caipChainId = toEvmCaipChainId(chainId as `0x${string}`);
      } else if (!isNaN(Number(chainId))) {
        // Decimal format, convert to EVM CAIP
        caipChainId = toEvmCaipChainId(toHex(chainId));
      }
    } catch (error) {
      // If conversion fails, return undefined
      return undefined;
    }

    if (caipChainId && networkConfigurations[caipChainId]) {
      return networkConfigurations[caipChainId].name;
    }

    return undefined;
  };
}
