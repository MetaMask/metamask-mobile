import {
  BridgeClientId,
  BridgeController,
  type BridgeControllerMessenger,
  type BridgeControllerState,
} from '@metamask/bridge-controller';
import { TransactionParams } from '@metamask/transaction-controller';
import { ChainId } from '@metamask/controller-utils';
import { ControllerInitFunction } from '../../types';
import { defaultBridgeControllerState } from './constants';

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
  const { controllerMessenger, getController, persistedState } = request;

  const transactionController = getController('TransactionController');

  const bridgeControllerState = (persistedState.BridgeController ??
    defaultBridgeControllerState) as BridgeControllerState;

  const controller = new BridgeController({
    messenger: controllerMessenger,
    clientId: BridgeClientId.MOBILE,
    state: bridgeControllerState,
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
