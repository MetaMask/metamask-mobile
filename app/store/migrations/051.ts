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

  for (const networkConfiguration of Object.values(
    networkControllerState.networkConfigurations as Record<
      string,
      {
        chainId: string;
        ticker: string;
      }
    >,
  )) {
    if (
      networkConfiguration.chainId === '0x89' &&
      networkConfiguration.ticker === 'MATIC'
    ) {
      networkConfiguration.ticker = 'POL';
    }
  }

  console.log('DEBUG: ', networkControllerState);

  return state;
}
