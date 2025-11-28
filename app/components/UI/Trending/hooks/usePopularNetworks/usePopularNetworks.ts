import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex, parseCaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import {
  NetworkConfiguration,
  RpcEndpointType,
} from '@metamask/network-controller';
import { getNetworkImageSource, isTestNet } from '../../../../../util/networks';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { PopularList } from '../../../../../util/networks/customNetworks';

/**
 * List of CAIP chain IDs to exclude from the popular networks list
 * These networks are not supported for trending/filtering features
 */
export const EXCLUDED_NETWORKS: CaipChainId[] = [
  'eip155:11297108109', // Palm
  'eip155:999', // Hyper EVM
  'eip155:143', // Monad
  'bip122:000000000019d6689c085ae165831e93', // Bitcoin Mainnet
];

/**
 * Hook to get popular networks, combining networks from Redux state and PopularList.
 * Filters out testnets, excluded networks, and ensures Ethereum Mainnet and Linea Mainnet appear first.
 * The selector selectNetworkConfigurationsByCaipChainId is affected by whether the user has removed or added a network.
 * This hook will return all popular networks regardless of whether the user has removed or added a network.
 *
 * @returns Array of ProcessedNetwork objects representing popular mainnet networks
 */
export const usePopularNetworks = (): ProcessedNetwork[] => {
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  return useMemo(() => {
    const processedNetworks: ProcessedNetwork[] = [];
    const addedCaipChainIds = new Set<CaipChainId>();

    // Helper function to check if a CAIP chain ID is a testnet
    const isTestnetCaipChainId = (caipChainId: CaipChainId): boolean => {
      const { namespace, reference } = parseCaipChainId(caipChainId);

      // Check EVM testnets using isTestNet helper
      if (namespace === 'eip155') {
        const hexChainId = `0x${parseInt(reference, 10).toString(16)}` as Hex;
        return isTestNet(hexChainId);
      }

      // Check Bitcoin testnets using full CAIP IDs from BtcScope
      if (namespace === 'bip122') {
        return (
          caipChainId === BtcScope.Testnet ||
          caipChainId === BtcScope.Testnet4 ||
          caipChainId === BtcScope.Regtest ||
          caipChainId === BtcScope.Signet
        );
      }

      // Check Solana testnets using full CAIP IDs from SolScope
      if (namespace === 'solana') {
        return caipChainId === SolScope.Devnet;
      }

      // For other namespaces, assume mainnet if not explicitly a testnet
      return false;
    };

    // First, add all networks from networkConfigurations (excluding testnets)
    for (const [caipChainId, config] of Object.entries(networkConfigurations)) {
      // Skip testnets using isTestnet helper and custom networks based of rpcEndpoints[defaultRpcEndpointIndex].type
      const isEvmCustomChain =
        config.caipChainId.startsWith('eip155') &&
        (config as NetworkConfiguration).rpcEndpoints?.[
          (config as NetworkConfiguration).defaultRpcEndpointIndex
        ]?.type === RpcEndpointType.Custom;

      if (
        isTestnetCaipChainId(caipChainId as CaipChainId) ||
        isEvmCustomChain
      ) {
        continue;
      }

      processedNetworks.push({
        id: caipChainId,
        name: config.name,
        caipChainId: caipChainId as CaipChainId,
        isSelected: false,
        imageSource: getNetworkImageSource({
          chainId: caipChainId,
        }),
      });
      addedCaipChainIds.add(caipChainId as CaipChainId);
    }

    // Then, add networks from PopularList that don't already exist in networkConfigurations (excluding testnets)
    for (const popularNetwork of PopularList) {
      const chainId = popularNetwork.chainId;
      const caipChainId = toEvmCaipChainId(chainId as Hex);

      // Only add if it doesn't already exist in networkConfigurations
      if (!addedCaipChainIds.has(caipChainId)) {
        processedNetworks.push({
          id: caipChainId,
          name: popularNetwork.nickname,
          caipChainId,
          isSelected: false,
          imageSource: getNetworkImageSource({
            chainId: caipChainId,
          }),
        });
        addedCaipChainIds.add(caipChainId);
      }
    }

    // Filter out excluded networks
    const filteredNetworks = processedNetworks.filter(
      (network) => !EXCLUDED_NETWORKS.includes(network.caipChainId),
    );

    // Sort networks so Ethereum Mainnet and Linea Mainnet appear first
    return filteredNetworks.sort((a, b) => {
      const ethereumMainnet = 'eip155:1';
      const lineaMainnet = 'eip155:59144';

      // Ethereum Mainnet should be first
      if (a.caipChainId === ethereumMainnet) return -1;
      if (b.caipChainId === ethereumMainnet) return 1;

      // Linea Mainnet should be second
      if (a.caipChainId === lineaMainnet) return -1;
      if (b.caipChainId === lineaMainnet) return 1;

      // All other networks maintain their original order
      return 0;
    });
  }, [networkConfigurations]);
};
