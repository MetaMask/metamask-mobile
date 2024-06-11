import { CHAIN_IDS } from '@metamask/transaction-controller/dist/constants';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { NetworkState } from '@metamask/network-controller';
import { NetworkType } from '@metamask/controller-utils';
import { LINEA_SEPOLIA_BLOCK_EXPLORER } from '../../../app/constants/urls';
import { ensureValidState } from './util';
import { CHAINLIST_CURRENCY_SYMBOLS_MAP } from '../../constants/network';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 43)) {
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 43: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 43: Invalid engine backgroundState error: '${typeof state
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
        `FATAL ERROR: Migration 43: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 43: NetworkController providerConfig not found: '${JSON.stringify(
          networkControllerState.providerConfig,
        )}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 43: NetworkController providerConfig chainId not found: '${JSON.stringify(
          networkControllerState.providerConfig.chainId,
        )}'`,
      ),
    );
    return state;
  }
  const chainId = networkControllerState.providerConfig.chainId;
  // If user on linea goerli, fallback to linea Sepolia
  if (chainId === CHAIN_IDS.LINEA_GOERLI) {
    networkControllerState.providerConfig = {
      chainId: CHAIN_IDS.LINEA_SEPOLIA,
      ticker: CHAINLIST_CURRENCY_SYMBOLS_MAP.LINEA_GOERLI,
      rpcPrefs: {
        blockExplorerUrl: LINEA_SEPOLIA_BLOCK_EXPLORER,
      },
      type: NetworkType['linea-sepolia'],
    };
    networkControllerState.selectedNetworkClientId =
      NetworkType['linea-sepolia'];
  }
  return state;
}
