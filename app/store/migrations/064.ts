import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * This migration checks if `selectedNetworkClientId` exists in any entry within `networkConfigurationsByChainId`.
 * If it does not, it sets `selectedNetworkClientId` to `'mainnet'`.
 * @param {unknown} stateAsync - Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!ensureValidState(state, 64)) {
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (
    !isObject(networkControllerState) ||
    !hasProperty(state.engine.backgroundState, 'NetworkController')
  ) {
    captureException(
      new Error(
        `Migration 62: Invalid or missing 'NetworkController' in backgroundState: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'selectedNetworkClientId') ||
    typeof networkControllerState.selectedNetworkClientId !== 'string'
  ) {
    captureException(
      new Error(
        `Migration 62: Missing or invalid 'selectedNetworkClientId': '${networkControllerState.selectedNetworkClientId}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'networkConfigurationsByChainId') ||
    !isObject(networkControllerState.networkConfigurationsByChainId)
  ) {
    captureException(
      new Error(
        `Migration 62: Missing or invalid 'networkConfigurationsByChainId' in NetworkController`,
      ),
    );
    return state;
  }

  const { selectedNetworkClientId, networkConfigurationsByChainId } =
    networkControllerState;

  // Check if selectedNetworkClientId exists in any network configuration
  let networkClientIdExists = false;

  for (const chainId in networkConfigurationsByChainId) {
    const networkConfig = networkConfigurationsByChainId[chainId];

    if (
      isObject(networkConfig) &&
      hasProperty(networkConfig, 'rpcEndpoints') &&
      Array.isArray(networkConfig.rpcEndpoints)
    ) {
      if (
        networkConfig.rpcEndpoints.some(
          (endpoint) =>
            isObject(endpoint) &&
            hasProperty(endpoint, 'networkClientId') &&
            endpoint.networkClientId === selectedNetworkClientId,
        )
      ) {
        networkClientIdExists = true;
        break;
      }
    } else {
      captureException(
        new Error(
          `Migration 62: Invalid network configuration or missing 'rpcEndpoints' for chainId: '${chainId}'`,
        ),
      );
    }
  }

  // If no matching networkClientId was found, set selectedNetworkClientId to 'mainnet'
  if (!networkClientIdExists) {
    networkControllerState.selectedNetworkClientId = 'mainnet';
  }

  return state;
}
