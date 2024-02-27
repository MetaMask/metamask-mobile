import { CHAIN_IDS } from '@metamask/transaction-controller/dist/constants';
import { SEPOLIA } from '../../../app/constants/network';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { NetworkState } from '@metamask/network-controller';
import NetworkList from '../../../app/util/networks';

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 30: Invalid state error: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 30: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 30: Invalid engine backgroundState error: '${typeof state
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
        `Migration 30: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `Migration 30: NetworkController providerConfig chainId not found: '${JSON.stringify(
          networkControllerState.providerConfig.chainId,
        )}'`,
      ),
    );
    return state;
  }
  const chainId = networkControllerState.providerConfig.chainId;
  // If user on goerli, fallback to Sepolia
  if (chainId === CHAIN_IDS.GOERLI) {
    networkControllerState.providerConfig = {
      chainId: CHAIN_IDS.SEPOLIA,
      ticker: 'SepoliaETH',
      type: SEPOLIA,
    };
    networkControllerState.networkId = `${NetworkList[SEPOLIA].networkId}`;
  }
  return state;
}
