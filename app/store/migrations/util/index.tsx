import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import Logger from '../../../util/Logger';
import { trackVaultCorruption } from '../../../util/analytics/vaultCorruptionTracking';

export interface ValidState {
  engine: {
    backgroundState: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
  security: Record<string, unknown>;
}

export function ensureValidState<T>(
  state: T,
  migrationNumber: number,
): state is T & ValidState {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid state error: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return false;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return false;
  }
  // This starts to flag issues since migration 93, when the EXISTING_USER flag is moved to the redux state
  // Check if user exists and has existingUser property set to true
  if (
    hasProperty(state, 'user') &&
    isObject(state.user) &&
    hasProperty(state.user, 'existingUser') &&
    state.user.existingUser === true
  ) {
    try {
      // Safely check for vault existence in KeyringController
      let hasVault = false;
      if (
        hasProperty(state.engine.backgroundState, 'KeyringController') &&
        isObject(state.engine.backgroundState.KeyringController) &&
        hasProperty(state.engine.backgroundState.KeyringController, 'vault')
      ) {
        const vault = state.engine.backgroundState.KeyringController.vault;
        hasVault = Boolean(vault);
      }

      Logger.log(
        'Is vault defined at KeyringController at migration when existingUser',
        hasVault,
      );

      // Track vault corruption if existing user has no vault
      if (!hasVault) {
        const errorMessage = `Migration ${migrationNumber}: Existing user missing vault in KeyringController`;
        trackVaultCorruption(errorMessage, {
          error_type: 'migration_missing_vault',
          context: 'migration_existing_user_validation',
          migration_number: migrationNumber,
        });
      }
    } catch (error) {
      Logger.error(
        new Error(
          `Migration ${migrationNumber}: Failed to log vault status: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ),
      );
    }
  }

  return true;
}

/**
 * Validates NetworkController state structure and network configuration for a specific chain.
 * This is a shared utility for migrations that add failover URLs to network configurations.
 *
 * @param state - The state to validate and migrate.
 * @param chainId - The chain ID of the network to migrate (e.g., '0x8f' for Monad).
 * @param migrationVersion - The migration version number.
 * @param networkName - The name of the network (e.g., 'Monad', 'SEI') for error messages.
 * @param quickNodeEnvVar - The environment variable name for the QuickNode URL (e.g., 'QUICKNODE_MONAD_URL').
 * @returns The migrated state, or the original state if validation fails or network is not configured.
 */
export function addFailoverUrlToNetworkConfiguration(
  state: unknown,
  chainId: string,
  migrationVersion: number,
  networkName: string,
  quickNodeEnvVar: string,
): unknown {
  try {
    // Validate basic state structure using shared utility
    if (!ensureValidState(state, migrationVersion)) {
      return state;
    }

    // Validate NetworkController-specific structure
    if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
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
        chainId,
      )
    ) {
      // Network not configured, no migration needed
      return state;
    }

    if (
      !isObject(
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId[chainId],
      )
    ) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid ${networkName} network configuration: '${typeof state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[chainId]}'`,
        ),
      );
      return state;
    }

    const networkConfigValue =
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId[chainId];

    if (!isObject(networkConfigValue)) {
      return state;
    }

    // TypeScript type assertion after validation
    const networkConfig = networkConfigValue as Record<string, unknown>;

    if (!hasProperty(networkConfig, 'rpcEndpoints')) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid ${networkName} network configuration: missing rpcEndpoints property`,
        ),
      );
      return state;
    }

    if (!Array.isArray(networkConfig.rpcEndpoints)) {
      captureException(
        new Error(
          `Migration ${migrationVersion}: Invalid ${networkName} network rpcEndpoints: expected array, got '${typeof networkConfig.rpcEndpoints}'`,
        ),
      );
      return state;
    }

    // Update RPC endpoints to add failover URL if needed
    networkConfig.rpcEndpoints = networkConfig.rpcEndpoints.map(
      (rpcEndpoint: unknown) => {
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
        const quickNodeUrl = process.env[quickNodeEnvVar];

        if (quickNodeUrl) {
          return {
            ...rpcEndpoint,
            failoverUrls: [quickNodeUrl],
          };
        }

        return rpcEndpoint;
      },
    );

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to add failoverUrls to ${networkName} network configuration: ${error}`,
      ),
    );
  }

  return state;
}
