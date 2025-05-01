import { isObject, hasProperty } from '@metamask/utils';
import { captureErrorException } from '../../util/sentry';

interface NetworkState {
  providerConfig: {
    chainId: string;
    ticker: string;
    type: string;
    rpcPrefs: {
      blockExplorerUrl: string;
    };
  };
  selectedNetworkClientId: string;
}

/**
 * This migration addresses the ticker be required
 * if it is not defined for the current network it will add the value ETH
 * @param {unknown} state - Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!isObject(state)) {
    captureErrorException(
      new Error(`Migration 34: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureErrorException(
      new Error(
        `Migration 34: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureErrorException(
      new Error(
        `Migration 34: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  const newNetworkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

  if (!isObject(networkControllerState)) {
    captureErrorException(
      new Error(
        `Migration 34: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'providerConfig') ||
    !isObject(networkControllerState.providerConfig)
  ) {
    captureErrorException(
      new Error(
        `Migration 34: Invalid NetworkController providerConfig: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.ticker) {
    newNetworkControllerState.providerConfig.ticker = 'ETH';
  }

  return state;
}
