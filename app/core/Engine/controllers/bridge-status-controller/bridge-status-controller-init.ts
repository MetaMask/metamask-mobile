import { BridgeClientId } from '@metamask/bridge-controller';
import {
  BridgeStatusController,
  BridgeStatusControllerMessenger,
} from '@metamask/bridge-status-controller';
import { handleFetch, TraceCallback } from '@metamask/controller-utils';

import { ControllerInitFunction, ControllerInitRequest } from '../../types';
import { BRIDGE_API_BASE_URL } from '../../../../constants/bridge';
import { trace } from '../../../../util/trace';
import Logger from '../../../../util/Logger';

export const bridgeStatusControllerInit: ControllerInitFunction<
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
      addTransactionFn: (
        ...args: Parameters<typeof transactionController.addTransaction>
      ) => transactionController.addTransaction(...args),
      estimateGasFeeFn: (
        ...args: Parameters<typeof transactionController.estimateGasFee>
      ) => transactionController.estimateGasFee(...args),
      addTransactionBatchFn: (
        ...args: Parameters<typeof transactionController.addTransactionBatch>
      ) => transactionController.addTransactionBatch(...args),
      updateTransactionFn: (
        ...args: Parameters<typeof transactionController.updateTransaction>
      ) => transactionController.updateTransaction(...args),
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
  request: ControllerInitRequest<BridgeStatusControllerMessenger>,
) {
  return {
    transactionController: request.getController('TransactionController'),
  };
}
