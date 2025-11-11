import { captureException } from '@sentry/react-native';
import { hasProperty } from '@metamask/utils';
import { isObject } from 'lodash';

import { ensureValidState } from './util';

const seiChainId = '0x531';
const migrationVersion = 107;
/**
 * Migration 107: Add failoverUrls to SEI network configuration
 *
 * This migration adds failoverUrls to the SEI network configuration
 * to ensure that the app can connect to the SEI network even if the
 * primary RPC endpoint is down.
 */
export default function migrate(state: unknown) {
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

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
        ) &&
        hasProperty(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId,
          seiChainId,
        ) &&
        isObject(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId],
        ) &&
        hasProperty(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId],
          'rpcEndpoints',
        ) &&
        Array.isArray(
          state.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId[seiChainId].rpcEndpoints,
        )
      )
    ) {
      return state;
    }

    // Update RPC endpoints to add failover URL if needed
    state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
      seiChainId
    ].rpcEndpoints =
      state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
        seiChainId
      ].rpcEndpoints.map((rpcEndpoint) => {
        // Skip if endpoint is not an object or doesn't have a url property
        if (
          !isObject(rpcEndpoint) ||
          !hasProperty(rpcEndpoint, 'url') ||
          typeof rpcEndpoint.url !== 'string'
        ) {
          return rpcEndpoint;
        }

        // Skip if endpoint already has failover URLs
        if (
          hasProperty(rpcEndpoint, 'failoverUrls') &&
          Array.isArray(rpcEndpoint.failoverUrls) &&
          rpcEndpoint.failoverUrls.length > 0
        ) {
          return rpcEndpoint;
        }

        // Add QuickNode failover URL
        const quickNodeUrl = process.env.QUICKNODE_SEI_URL;

        if (quickNodeUrl) {
          return {
            ...rpcEndpoint,
            failoverUrls: [quickNodeUrl],
          };
        }

        return rpcEndpoint;
      });

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to add failoverUrls to SEI network configuration: ${error}`,
      ),
    );
  }

  return state;
}
