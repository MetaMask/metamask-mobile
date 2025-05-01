import { isObject, hasProperty } from '@metamask/utils';
import { NetworkState, RpcEndpointType } from '@metamask/network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { captureErrorException } from '../../util/sentry';

/**
 * Migration to delete Goerli and Linea Goerli configurations if they are Infura types.
 * @param {unknown} stateAsync - Promise Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!isObject(state)) {
    captureErrorException(
      new Error(`Migration: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureErrorException(
      new Error(
        `Migration: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureErrorException(
      new Error(
        `Migration: Invalid root engine backgroundState: '${typeof state.engine
          .backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;
  if (!isObject(networkControllerState)) {
    captureErrorException(
      new Error(
        `Migration: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  const networkConfigurationsByChainId =
    networkControllerState.networkConfigurationsByChainId;

  if (!isObject(networkConfigurationsByChainId)) {
    captureErrorException(
      new Error(
        `Migration: Invalid networkConfigurationsByChainId: '${typeof networkConfigurationsByChainId}'`,
      ),
    );
    return state;
  }

  // Chain IDs to remove
  const chainIdsToRemove = [CHAIN_IDS.GOERLI, CHAIN_IDS.LINEA_GOERLI];

  // Filter out Goerli and Linea Goerli configurations with Infura type
  chainIdsToRemove.forEach((chainId) => {
    if (hasProperty(networkConfigurationsByChainId, chainId)) {
      const config = networkConfigurationsByChainId[chainId];

      if (
        Array.isArray(config.rpcEndpoints) &&
        config.rpcEndpoints.some(
          (endpoint) => endpoint.type === RpcEndpointType.Infura,
        )
      ) {
        delete networkConfigurationsByChainId[chainId];
      }
    }
  });

  return state;
}
