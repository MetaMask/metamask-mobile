import { captureException } from '@sentry/react-native';
import { hasProperty } from '@metamask/utils';
import { isObject } from 'lodash';

import { ensureValidState } from './util';

const monadChainId = '0x8f';
const migrationVersion = 108;
/**
 * Migration 108: Add failoverUrls to Monad network configuration
 *
 * This migration adds failoverUrls to the Monad network configuration
 * to ensure that the app can connect to the Monad network even if the
 * primary RPC endpoint is down.
 */
export default function migrate(state: unknown) {
  try {
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    // Validate if the NetworkController state exists and has the expected structure.
    if (
      !hasProperty(state, 'engine') ||
      !hasProperty(state.engine, 'backgroundState') ||
      !hasProperty(state.engine.backgroundState, 'NetworkController')
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state structure: missing required properties`,
        ),
      );
      return state;
    }

    if (!isObject(state.engine.backgroundState.NetworkController)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: '${typeof state.engine.backgroundState.NetworkController}'`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(
        state.engine.backgroundState.NetworkController,
        'networkConfigurationsByChainId',
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController state: missing networkConfigurationsByChainId property`,
        ),
      );
      return state;
    }

    if (
      !isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid NetworkController networkConfigurationsByChainId: '${typeof state.engine.backgroundState.NetworkController.networkConfigurationsByChainId}'`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId,
        monadChainId,
      )
    ) {
      // Monad network not configured, no migration needed
      return state;
    }

    if (
      !isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[monadChainId],
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid Monad network configuration: '${typeof state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[monadChainId]}'`,
        ),
      );
      return state;
    }

    if (
      !hasProperty(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[monadChainId],
        'rpcEndpoints',
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid Monad network configuration: missing rpcEndpoints property`,
        ),
      );
      return state;
    }

    if (
      !Array.isArray(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[monadChainId].rpcEndpoints,
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid Monad network rpcEndpoints: expected array, got '${typeof state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[monadChainId].rpcEndpoints}'`,
        ),
      );
      return state;
    }

    // Update RPC endpoints to add failover URL if needed
    state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
      monadChainId
    ].rpcEndpoints =
      state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
        monadChainId
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
        const quickNodeUrl = process.env.QUICKNODE_MONAD_URL;

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
        `Migration ${migrationVersion}: Failed to add failoverUrls to Monad network configuration: ${error}`,
      ),
    );
  }

  return state;
}
