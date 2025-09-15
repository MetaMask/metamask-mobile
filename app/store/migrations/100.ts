import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { NetworkConfiguration } from '@metamask/network-controller';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';

const CHAINS_TO_RENAME: {
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
    fromName: 'Avalanche Network C-Chain',
    toName: 'Avalanche',
  },
  {
    id: NETWORK_CHAIN_ID.BSC,
    fromName: 'Binance Smart Chain',
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
    CHAINS_TO_RENAME.forEach((chain) => {
      // We only update the network name if it exists in the state
      // and matches the expected chain ID and name.
      if (
        hasProperty(state, 'engine') &&
        hasProperty(state.engine, 'backgroundState') &&
        hasProperty(state.engine.backgroundState, 'NetworkController') &&
        isObject(state.engine.backgroundState.NetworkController) &&
        isObject(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId,
        ) &&
        hasProperty(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId,
          chain.id,
        ) &&
        isObject(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[chain.id],
        )
      ) {
        // Update the network name if it matches the expected name
        if (
          hasProperty(
            state.engine.backgroundState.NetworkController
              .networkConfigurationsByChainId[chain.id] as NetworkConfiguration,
            'name',
          ) &&
          (
            state.engine.backgroundState.NetworkController
              .networkConfigurationsByChainId[chain.id] as NetworkConfiguration
          ).name === chain.fromName
        ) {
          (
            state.engine.backgroundState.NetworkController
              .networkConfigurationsByChainId[chain.id] as NetworkConfiguration
          ).name = chain.toName;
        }
      }
    });

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
