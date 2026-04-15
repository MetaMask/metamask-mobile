import { BridgeClientId } from '@metamask/bridge-controller';
import {
  BridgeStatusController,
  BridgeStatusControllerMessenger,
} from '@metamask/bridge-status-controller';
import { handleFetch, TraceCallback } from '@metamask/controller-utils';

import {
  MessengerClientInitFunction,
  MessengerClientInitRequest,
} from '../../types';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

export const bridgeStatusControllerInit: MessengerClientInitFunction<
  BridgeStatusController,
  BridgeStatusControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;
  const { transactionController } = getControllers(request);

  try {
    /* bridge status controller Initialization */
    const bridgeStatusController = new BridgeStatusController({
      messenger: controllerMessenger,
      state: persistedState.BridgeStatusController,
      clientId: BridgeClientId.MOBILE,
      fetchFn: handleFetch,
      addTransactionBatchFn: (
        ...args: Parameters<typeof transactionController.addTransactionBatch>
      ) => transactionController.addTransactionBatch(...args),
      traceFn: trace as TraceCallback,
      config: {
        customBridgeApiBaseUrl: BRIDGE_API_BASE_URL,
      },
    });

    return { controller: bridgeStatusController };
  } catch (error) {
    Logger.error(error as Error, 'Failed to initialize BridgeStatusController');
    throw error;
  }
};

function getControllers(
  request: MessengerClientInitRequest<BridgeStatusControllerMessenger>,
) {
  return {
    transactionController: request.getMessengerClient('TransactionController'),
  };
}
