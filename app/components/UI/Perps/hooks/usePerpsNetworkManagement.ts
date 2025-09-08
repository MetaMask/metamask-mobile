import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { usePerpsNetwork } from './usePerpsNetwork';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import Engine from '../../../../core/Engine';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  ARBITRUM_MAINNET_CAIP_CHAIN_ID,
  ARBITRUM_TESTNET_CAIP_CHAIN_ID,
} from '../constants/hyperLiquidConfig';

/* eslint-disable @typescript-eslint/no-require-imports, import/no-commonjs */
const InfuraKey = process.env.MM_INFURA_PROJECT_ID;
const infuraProjectId = InfuraKey === 'null' ? '' : InfuraKey;

/**
 * Hook for managing Arbitrum network for perps trading
 * Handles network existence check and automatic addition if needed
 */
export const usePerpsNetworkManagement = () => {
  const currentNetwork = usePerpsNetwork();
  const { enableNetwork, isNetworkEnabled } = useNetworkEnablement();
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  /**
   * Gets the appropriate Arbitrum chain ID based on current network
   */
  const getArbitrumChainId = useCallback(
    () =>
      currentNetwork === 'testnet'
        ? ARBITRUM_TESTNET_CAIP_CHAIN_ID
        : ARBITRUM_MAINNET_CAIP_CHAIN_ID,
    [currentNetwork],
  );

  /**
   * Ensures the Arbitrum network exists and is enabled
   * @returns Promise that resolves when network is ready
   */
  const ensureArbitrumNetworkExists = useCallback(async () => {
    const arbitrumCaipChainId = getArbitrumChainId();
    const chainId = toHex(parseInt(arbitrumCaipChainId.split(':')[1], 10));

    // Check if network already exists & doesn't contain arbitrum in selected networks
    if (
      networkConfigurations[chainId] &&
      !isNetworkEnabled(arbitrumCaipChainId)
    ) {
      // Network exists, just enable it
      enableNetwork(arbitrumCaipChainId);
      return;
    }

    // Network doesn't exist, add it
    const { NetworkController } = Engine.context;

    try {
      // Add the network
      await NetworkController.addNetwork({
        chainId,
        blockExplorerUrls: [
          currentNetwork === 'testnet'
            ? 'https://sepolia.arbiscan.io'
            : 'https://arbiscan.io',
        ],
        defaultRpcEndpointIndex: 0,
        defaultBlockExplorerUrlIndex: 0,
        name:
          currentNetwork === 'testnet' ? 'Arbitrum Sepolia' : 'Arbitrum One',
        nativeCurrency: 'ETH',
        rpcEndpoints: [
          {
            url:
              currentNetwork === 'testnet'
                ? `https://arbitrum-sepolia.infura.io/v3/${infuraProjectId}`
                : `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`,
            name:
              currentNetwork === 'testnet'
                ? 'Arbitrum Sepolia'
                : 'Arbitrum One',
            type: RpcEndpointType.Custom,
          },
        ],
      });

      // Enable the newly added network
      enableNetwork(arbitrumCaipChainId);
    } catch (error) {
      console.error('Failed to add Arbitrum network:', error);
      // If adding fails, still try to enable the network (it might already exist)
      enableNetwork(arbitrumCaipChainId);
      throw error;
    }
  }, [
    getArbitrumChainId,
    networkConfigurations,
    isNetworkEnabled,
    enableNetwork,
    currentNetwork,
  ]);

  /**
   * Enables the Arbitrum network without checking if it exists
   * Use this when you know the network is already added
   */
  const enableArbitrumNetwork = useCallback(() => {
    const arbitrumCaipChainId = getArbitrumChainId();
    enableNetwork(arbitrumCaipChainId);
  }, [enableNetwork, getArbitrumChainId]);

  return {
    ensureArbitrumNetworkExists,
    enableArbitrumNetwork,
    getArbitrumChainId,
    currentNetwork,
  };
};
