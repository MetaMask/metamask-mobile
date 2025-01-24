import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to overwrite MATIC token ticker to POL
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 51)) {
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(networkControllerState.networkConfigurations)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: NetworkController networkConfigurations not found: '${JSON.stringify(
          networkControllerState.networkConfigurations,
        )}'`,
      ),
    );
    return state;
  }

  if (!isObject(networkControllerState.providerConfig)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: providerConfig not found: '${JSON.stringify(
          networkControllerState.providerConfig,
        )}'`,
      ),
    );
    return state;
  }

  // update network settings if chain 0x89 and ticker is MATIC
  for (const networkConfiguration of Object.values(
    networkControllerState.networkConfigurations,
  )) {
    if (
      isObject(networkConfiguration) &&
      networkConfiguration.chainId === '0x89' &&
      networkConfiguration.ticker === 'MATIC'
    ) {
      networkConfiguration.ticker = 'POL';
    }
  }

  // update ticker to POL in providerConfig if chainId is 0x89 and ticker is MATIC
  // needed if user is already on selectedNetworkId that maps to pre-existing MATIC ticker
  if (
    isObject(networkControllerState) &&
    isObject(networkControllerState.providerConfig) &&
    networkControllerState.providerConfig.chainId === '0x89' &&
    networkControllerState.providerConfig.ticker === 'MATIC'
  ) {
    networkControllerState.providerConfig.ticker = 'POL';
  }

  return state;
}
