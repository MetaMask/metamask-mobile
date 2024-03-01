import { captureException } from '@sentry/react-native';
import { isObject, hasProperty, Hex } from '@metamask/utils';
import type {
  NetworkState,
  NetworkConfigurations,
} from '@metamask/network-controller';

function findKeyByChainId(
  networkConfigurations: NetworkConfigurations,
  chainId: Hex,
): string {
  for (const key in networkConfigurations) {
    if (networkConfigurations[key].chainId === chainId) {
      return key;
    }
  }
  throw new Error(`Key with chainId ${chainId} not found.`);
}

/**
 * Enable security alerts by default.
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 32: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 32: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 32: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;
  const newNetworkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;

  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(networkControllerState, 'providerConfig') ||
    !isObject(networkControllerState.providerConfig)
  ) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController providerConfig: '${typeof networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.ticker) {
    newNetworkControllerState.providerConfig.ticker = 'ETH';
  }

  if (
    !hasProperty(networkControllerState, 'networkDetails') ||
    !isObject(networkControllerState.networkDetails)
  ) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController networkDetails: '${typeof networkControllerState.networkDetails}'`,
      ),
    );
    return state;
  }
  /*
* Trying to understand if we need to pre populate the new property `networksMetadata`
* it seems that countains networkStatus
* that property needs to be used on the getEIP1559Compatibility function and on the backgroundBridge file

State example:
{"networkConfigurations": 
{"1409fc9f-47a6-4b96-bbc4-7031e7f1af6e": {"chainId": "0xa86a", "id": "1409fc9f-47a6-4b96-bbc4-7031e7f1af6e", "nickname": "Avalanche Mainnet C-Chain", "rpcPrefs": [Object], "rpcUrl": "https://api.avax.network/ext/bc/C/rpc", "ticker": "AVAX"}}, "networkDetails": {"EIPS": {"1559": true}},
 "networkId": null,
  "networkStatus": "available",
   "networksMetadata": 
   {"1409fc9f-47a6-4b96-bbc4-7031e7f1af6e": {"EIPS": [Object], "status": "available"}, 
   "linea-mainnet": {"EIPS": [Object], "status": "available"}, 
   "mainnet": {"EIPS": [Object], "status": "available"}}, 
   "providerConfig": {"chainId": "0xa86a", "id": "1409fc9f-47a6-4b96-bbc4-7031e7f1af6e", "nickname": "Avalanche Mainnet C-Chain", "rpcPrefs": {"blockExplorerUrl": "https://snowtrace.io"}, "rpcUrl": "https://api.avax.network/ext/bc/C/rpc", "ticker": "AVAX", "type": "rpc"}, "selectedNetworkClientId": "1409fc9f-47a6-4b96-bbc4-7031e7f1af6e"}


*/
  if (networkControllerState.networkDetails) {
    delete networkControllerState.networkDetails;
  }
  if (networkControllerState.networkStatus) {
    delete networkControllerState.networkStatus;
  }

  if (
    !hasProperty(networkControllerState, 'networkConfigurations') ||
    !isObject(networkControllerState.networkConfigurations)
  ) {
    captureException(
      new Error(
        `Migration 32: Invalid NetworkController networkConfigurations: '${typeof networkControllerState.networkConfigurations}'`,
      ),
    );
    return state;
  }

  if (networkControllerState.providerConfig.type) {
    newNetworkControllerState.selectedNetworkClientId =
      newNetworkControllerState.providerConfig.type === 'rpc'
        ? findKeyByChainId(
            networkControllerState.networkConfigurations as NetworkConfigurations,
            networkControllerState.providerConfig.chainId as Hex,
          )
        : newNetworkControllerState.providerConfig.type;
  }

  return state;
}
