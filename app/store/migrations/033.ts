import { CHAIN_IDS } from '@metamask/transaction-controller';
import { SEPOLIA } from '../../constants/network';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import NetworkList from '../../util/networks';

export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 33: Invalid state error: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 33: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 33: Invalid engine backgroundState error: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }
  const networkControllerState = state.engine.backgroundState.NetworkController;
  if (!isObject(networkControllerState)) {
    captureException(
      new Error(
        `Migration 33: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(networkControllerState.providerConfig)) {
    captureException(
      new Error(
        `Migration 33: NetworkController providerConfig not found: '${networkControllerState.providerConfig}'`,
      ),
    );
    return state;
  }

  if (!networkControllerState.providerConfig.chainId) {
    captureException(
      new Error(
        `Migration 33: NetworkController providerConfig chainId not found: '${JSON.stringify(
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
