import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { NetworkConfiguration } from '@metamask/network-controller';
import { NETWORK_CHAIN_ID } from '../../util/networks/customNetworks';

/**
 * Migration 094: Update Sei Network Name
 *
 * This migration updates:
 * - the SEI network name from `Sei Network` to `Sei Mainnet`.
 * - the SEI RPC name from `Sei Network` to `Sei Mainnet`.
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 94;
  const fromName = 'Sei Network';
  const toName = 'Sei Mainnet';
  const seiChainId = NETWORK_CHAIN_ID.SEI_MAINNET;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
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
        seiChainId,
      ) &&
      isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[seiChainId],
      )
    ) {
      // Update the network name if it matches the expected name
      if (
        hasProperty(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId] as NetworkConfiguration,
          'name',
        ) &&
        (
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId] as NetworkConfiguration
        ).name === fromName
      ) {
        (
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId] as NetworkConfiguration
        ).name = toName;
      }

      // Update the RPC Name if it matches the expected name
      if (
        hasProperty(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId] as NetworkConfiguration,
          'rpcEndpoints',
        ) &&
        Array.isArray(
          (
            state.engine.backgroundState.NetworkController
              .networkConfigurationsByChainId[
              seiChainId
            ] as NetworkConfiguration
          ).rpcEndpoints,
        )
      ) {
        const rpcEndpoints = (
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId] as NetworkConfiguration
        ).rpcEndpoints;
        rpcEndpoints.forEach((endpoint) => {
          if (endpoint.name === fromName) {
            endpoint.name = toName;
          }
        });
      }
    }
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to update Sei network name: ${String(
          error,
        )}`,
      ),
    );
    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
