import {
  BridgeClientId,
  BridgeController,
  type BridgeControllerMessenger,
} from '@metamask/bridge-controller';
import { TransactionParams } from '@metamask/transaction-controller';
import { ChainId } from '@metamask/controller-utils';
import { ControllerInitFunction } from '../../types';

/**
 * Initialize the BridgeController.
 *
 * @param request - The request object.
 * @returns The BridgeController.
 */
export const bridgeControllerInit: ControllerInitFunction<
  BridgeController,
  BridgeControllerMessenger
> = (request) => {
  const { controllerMessenger, getController } = request;

  const transactionController = getController('TransactionController');

  const controller = new BridgeController({
    messenger: controllerMessenger,
    clientId: BridgeClientId.MOBILE,
    // TODO: change getLayer1GasFee type to match transactionController.getLayer1GasFee
    getLayer1GasFee: async ({
      transactionParams,
      chainId,
    }: {
      transactionParams: TransactionParams;
      chainId: ChainId;
    }) =>
      (await transactionController.getLayer1GasFee({
        transactionParams,
        chainId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
    fetchFn: fetch,
  });

  return { controller };
};
