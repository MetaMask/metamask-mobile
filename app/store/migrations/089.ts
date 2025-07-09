import { captureException } from '@sentry/react-native';
import { hasProperty, Hex, isObject } from '@metamask/utils';
import {
  type NetworkConfiguration,
} from '@metamask/network-controller';

import { ensureValidState } from './util';
import { NETWORKS_CHAIN_ID } from '../../constants/network';

// Default block explorer URLs for various networks
// These URLs are aligned with MetaMask Extension 
const MAINNET_DEFAULT_BLOCK_EXPLORER_URL = 'https://etherscan.io/';
const LINEA_DEFAULT_BLOCK_EXPLORER_URL = 'https://lineascan.build/';
const BASE_DEFAULT_BLOCK_EXPLORER_URL = 'https://basescan.org/';
const SEPOLIA_DEFAULT_BLOCK_EXPLORER_URL = 'https://sepolia.etherscan.io/';
const LINEA_SEPOLIA_DEFAULT_BLOCK_EXPLORER_URL = 'https://sepolia.lineascan.build/'

export const CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP: Record<Hex, string> = {
  [NETWORKS_CHAIN_ID.MAINNET]: MAINNET_DEFAULT_BLOCK_EXPLORER_URL,
  [NETWORKS_CHAIN_ID.LINEA_MAINNET]: LINEA_DEFAULT_BLOCK_EXPLORER_URL,
  [NETWORKS_CHAIN_ID.BASE]: BASE_DEFAULT_BLOCK_EXPLORER_URL,
  [NETWORKS_CHAIN_ID.LINEA_SEPOLIA]: LINEA_SEPOLIA_DEFAULT_BLOCK_EXPLORER_URL,
  [NETWORKS_CHAIN_ID.SEPOLIA]: SEPOLIA_DEFAULT_BLOCK_EXPLORER_URL,
};

/**
 * Migration 89: Re-fill BlockExploer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 89;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      hasProperty(state, 'engine') &&
      hasProperty(state.engine, 'backgroundState') &&
      hasProperty(state.engine.backgroundState, 'NetworkController') &&
      isObject(state.engine.backgroundState.NetworkController) &&
      isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
      )
    ) {
        const networkConfigurationsByChainId = state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as unknown as Record<Hex, NetworkConfiguration>;

        // Re-fill the block explorer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base
        Object.entries(CHAINID_DEFAULT_BLOCK_EXPLORER_URL_MAP).forEach(
          ([chainId, blockExplorerUrl]) => {
            // Ensure the chainId is existing in the network configurations
            if (
              hasProperty(networkConfigurationsByChainId, chainId)
            ) {  
              const networkConfiguration = networkConfigurationsByChainId[chainId] as NetworkConfiguration;

              // We only re-fill the block explorer URLs if they are not already set
              if (
                !networkConfiguration.blockExplorerUrls ||
                (Array.isArray(networkConfiguration.blockExplorerUrls) &&
                  networkConfiguration.blockExplorerUrls.length === 0)
              ) {
                networkConfiguration.blockExplorerUrls = [
                  blockExplorerUrl,
                ];
                networkConfiguration.defaultBlockExplorerUrlIndex = 0;
              }
            }
          },
        );
    } else {
      captureException(
        new Error(
          `Migration ${migrationVersion}: NetworkController or networkConfigurationsByChainId not found in state`,
        ),
      );
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Re-fill BlockExploer URLs for Mainnet, Sepolia, Linea Mainnet, Linea Sepolia, and Base failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
