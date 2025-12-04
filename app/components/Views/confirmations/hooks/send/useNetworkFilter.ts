import { useState, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { parseCaipChainId, Hex, CaipChainId } from '@metamask/utils';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { isTestNet } from '../../../../../util/networks';
import { AssetType } from '../../types/token';
import { type NetworkInfo } from './useNetworks';

export const NETWORK_FILTER_ALL = 'all';

export interface UseNetworkFilterResult {
  selectedNetworkFilter: string;
  setSelectedNetworkFilter: (filter: string) => void;
  filteredTokensByNetwork: AssetType[];
  networksWithTokens: NetworkInfo[];
}

/**
 * Check if a network is a testnet based on its chainId.
 * Handles both EVM (hex chainIds) and non-EVM (CAIP chainIds) networks.
 *
 * @param chainId - The chain ID to check (can be hex format or CAIP format)
 * @returns True if the network is a testnet, false otherwise
 */
const isNetworkTestnet = (chainId: string): boolean => {
  // Check if it's a CAIP chain ID (non-EVM networks)
  if (chainId.includes(':')) {
    try {
      const { namespace, reference } = parseCaipChainId(chainId as CaipChainId);

      // Check EVM testnets using isTestNet helper
      if (namespace === 'eip155') {
        const hexChainId = `0x${parseInt(reference, 10).toString(16)}` as Hex;
        return isTestNet(hexChainId);
      }

      // Check Bitcoin testnets using full CAIP IDs from BtcScope
      if (namespace === 'bip122') {
        return (
          chainId === BtcScope.Testnet ||
          chainId === BtcScope.Testnet4 ||
          chainId === BtcScope.Regtest ||
          chainId === BtcScope.Signet
        );
      }

      // Check Solana testnets using full CAIP IDs from SolScope
      if (namespace === 'solana') {
        return chainId === SolScope.Devnet;
      }

      // For other namespaces, assume mainnet if not explicitly a testnet
      return false;
    } catch {
      // If parsing fails, fall back to EVM check
      return isTestNet(chainId as Hex);
    }
  }

  // For hex chainIds (EVM networks), use isTestNet directly
  return isTestNet(chainId as Hex);
};

export const useNetworkFilter = (
  tokens: AssetType[],
  networks: NetworkInfo[],
): UseNetworkFilterResult => {
  const [selectedNetworkFilter, setSelectedNetworkFilter] =
    useState(NETWORK_FILTER_ALL);

  const networksWithTokens = useMemo(() => {
    const tokenChainIds = new Set(tokens.map((token) => token.chainId));
    const filteredNetworks = networks.filter((network) =>
      tokenChainIds.has(network.chainId),
    );

    // Calculate total fiat value for each network
    const networksWithValues = filteredNetworks.map((network) => {
      const totalValue = tokens
        .filter((token) => token.chainId === network.chainId)
        .reduce((sum, token) => {
          const fiatBalance = token.fiat?.balance || '0';
          return sum.plus(new BigNumber(fiatBalance));
        }, new BigNumber(0));

      return {
        network,
        totalValue,
        isTestnet: isNetworkTestnet(network.chainId),
      };
    });

    // Separate into mainnet and testnet groups
    const mainnets = networksWithValues.filter((item) => !item.isTestnet);
    const testnets = networksWithValues.filter((item) => item.isTestnet);

    // Sort each group by value (descending - highest first)
    mainnets.sort((a, b) => b.totalValue.comparedTo(a.totalValue) || 0);
    testnets.sort((a, b) => b.totalValue.comparedTo(a.totalValue) || 0);

    // Combine: mainnets first, then testnets
    return [...mainnets, ...testnets].map((item) => item.network);
  }, [tokens, networks]);

  const filteredTokensByNetwork = useMemo(() => {
    if (selectedNetworkFilter === NETWORK_FILTER_ALL) {
      return tokens;
    }

    return tokens.filter((token) => token.chainId === selectedNetworkFilter);
  }, [tokens, selectedNetworkFilter]);

  return {
    selectedNetworkFilter,
    setSelectedNetworkFilter,
    filteredTokensByNetwork,
    networksWithTokens,
  };
};
