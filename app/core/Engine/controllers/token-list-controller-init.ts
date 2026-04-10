import { MessengerClientInitFunction } from '../types';
import {
  TokenListController,
  type TokenListControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenListControllerInitMessenger } from '../messengers/token-list-controller-messenger';
import { getGlobalChainId } from '../../../util/networks/global-network';

/**
 * Initialize the tokenList controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenListControllerInit: MessengerClientInitFunction<
  TokenListController,
  TokenListControllerMessenger,
  TokenListControllerInitMessenger
> = ({
  controllerMessenger,
  initMessenger,
  getMessengerClient,
  persistedState,
}) => {
  const networkController = getMessengerClient('NetworkController');

  const messengerClient = new TokenListController({
    messenger: controllerMessenger,
    chainId: getGlobalChainId(networkController),
    state: persistedState.TokenListController,
    onNetworkStateChange: (listener) =>
      initMessenger.subscribe(
        'NetworkController:stateChange',
        // TODO: Remove type assertion once @metamask/network-controller versions are aligned.
        // Currently there's a version mismatch between the direct dependency and the one
        // nested in @metamask/transaction-controller, causing NetworkState type incompatibility.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (networkState) => listener(networkState as any),
      ),
  });

  messengerClient.initialize().catch(() => {
    // Initialization failed
  });

  return {
    messengerClient,
  };
};
