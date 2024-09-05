import { CHAIN_IDS } from '@metamask/transaction-controller';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { NetworkState } from '@metamask/network-controller';
import { NetworkType } from '@metamask/controller-utils';
import { LINEA_SEPOLIA_BLOCK_EXPLORER } from '../../../app/constants/urls';
import { ensureValidState } from './util';
import { CHAINLIST_CURRENCY_SYMBOLS_MAP } from '../../constants/network';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 46)) {
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }
  const networkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;
  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  const selectedNetworkConfig =
    networkControllerState.networkConfigurations[
      networkControllerState.selectedNetworkClientId
    ];

  if (!selectedNetworkConfig) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: NetworkController networkConfigurations not found: '${JSON.stringify(
          selectedNetworkConfig,
        )}'`,
      ),
    );
    return state;
  }

  if (!selectedNetworkConfig.chainId) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: NetworkController networkConfigurations chainId not found: '${JSON.stringify(
          selectedNetworkConfig.chainId,
        )}'`,
      ),
    );
    return state;
  }

  const chainId = selectedNetworkConfig.chainId;

  // If user is on linea-goerli, switch to linea-sepolia
  if (chainId === CHAIN_IDS.LINEA_GOERLI) {
    networkControllerState.selectedNetworkClientId =
      NetworkType['linea-sepolia'];

    // Remove linea-goerli from network configurations
    delete networkControllerState.networkConfigurations['linea-goerli'];

    // Update network configuration to reflect linea-sepolia
    networkControllerState.networkConfigurations[
      networkControllerState.selectedNetworkClientId
    ] = {
      id: 'linea-sepolia',
      chainId: CHAIN_IDS.LINEA_SEPOLIA,
      ticker: CHAINLIST_CURRENCY_SYMBOLS_MAP.LINEA_SEPOLIA, // Correct the ticker mapping here
      type: NetworkType['linea-sepolia'],
      rpcPrefs: {
        blockExplorerUrl: LINEA_SEPOLIA_BLOCK_EXPLORER,
      },
      rpcUrl:
        networkControllerState.networkConfigurations['linea-sepolia'].rpcUrl,
    };
  }

  return state;
}
