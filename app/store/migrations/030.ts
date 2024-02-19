import { CHAIN_IDS } from '@metamask/transaction-controller/dist/constants';
import { SEPOLIA } from '../../../app/constants/network';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { NetworkState } from '@metamask/network-controller';

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 30: Invalid state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(`Migration 30: Invalid engine state: '${typeof state.engine}'`),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 30: Invalid engine backgroundState: '${typeof state.engine
          .backgroundState}'`,
      ),
    );
    return state;
  }
  const networkControllerState = state.engine.backgroundState
    .NetworkController as NetworkState;
  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 30: Invalid NetworkController state: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `Migration 30: Invalid NetworkController providerConfig chainId: '${JSON.stringify(
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
  }
  return state;
}
