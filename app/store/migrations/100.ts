import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';

export const CHAINS_TO_RENAME: {
  readonly id: string;
  readonly fromName: string;
  readonly toName: string;
}[] = [
  {
    id: NETWORK_CHAIN_ID.LINEA_MAINNET,
    fromName: 'Linea Mainnet',
    toName: 'Linea',
  },
  {
    id: NETWORK_CHAIN_ID.BASE,
    fromName: 'Base Mainnet',
    toName: 'Base',
  },
  {
    id: NETWORK_CHAIN_ID.ARBITRUM,
    fromName: 'Arbitrum One',
    toName: 'Arbitrum',
  },
  {
    id: NETWORK_CHAIN_ID.AVALANCHE,
    fromName: 'Avalanche C-Chain',
    toName: 'Avalanche',
  },
  {
    id: NETWORK_CHAIN_ID.BSC,
    fromName: 'BNB Smart Chain Mainnet',
    toName: 'BNB Chain',
  },
  {
    id: NETWORK_CHAIN_ID.OPTIMISM,
    fromName: 'OP Mainnet',
    toName: 'OP',
  },
  {
    id: NETWORK_CHAIN_ID.POLYGON,
    fromName: 'Polygon Mainnet',
    toName: 'Polygon',
  },
  {
    id: NETWORK_CHAIN_ID.SEI,
    fromName: 'Sei Mainnet',
    toName: 'Sei',
  },
  {
    id: NETWORK_CHAIN_ID.ZKSYNC_ERA,
    fromName: 'zkSync Mainnet',
    toName: 'zkSync Era',
  },
];

/**
 * Migration 100: Update Network Names
 *
 * This migration updates:
 * - the SEI network name from `Sei Network` to `Sei Mainnet`.
 * - the SEI RPC name from `Sei Network` to `Sei Mainnet`.
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 100;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Validate if the NetworkController state exists and has the expected structure.
    if (
      !(
        hasProperty(state, 'engine') &&
        hasProperty(state.engine, 'backgroundState') &&
        hasProperty(state.engine.backgroundState, 'NetworkController') &&
        isObject(state.engine.backgroundState.NetworkController) &&
        hasProperty(
          state.engine.backgroundState.NetworkController,
          'networkConfigurationsByChainId',
        ) &&
        isObject(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId,
        )
      )
    ) {
      return state;
    }

    for (const chain of CHAINS_TO_RENAME) {
      const networkConfigsByChainId =
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId;

      // If the chain ID is not found, skip it.
      if (!hasProperty(networkConfigsByChainId, chain.id)) {
        continue;
      }

      // If the network configuration for the chain is not found, skip it.
      const networkConfigsForChain = networkConfigsByChainId[chain.id];
      if (
        isObject(networkConfigsForChain) &&
        hasProperty(networkConfigsForChain, 'name') &&
        networkConfigsForChain.name === chain.fromName
      ) {
        networkConfigsForChain.name = chain.toName;
      }
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to update network names: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
