import { query } from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import { createMethodMiddleware } from '@metamask/json-rpc-engine';
import {
  methodHandlers as multichainMethodHandlers,
  type MethodHandlerHooks as MultichainHandlerHooks,
} from '@metamask/multichain-api-middleware';

import Engine from '../Engine';

export const UNSUPPORTED_RPC_METHODS = new Set([
  // This is implemented later in our middleware stack – specifically, in
  // eth-json-rpc-middleware – but our UI does not support it.
  'eth_signTransaction' as const,
]);

const onError = (error: unknown) => {
  if (process.env.METAMASK_DEBUG) {
    console.error(error);
  }
};

/**
 * Handles methods specific to the MultiChain API (e.g., `wallet_createSession`,
 * `wallet_invokeMethod`).
 *
 * The `wallet_invokeMethod` handler unwraps the inner request, mutates `req`
 * in place, and forwards it via `next()`. The unwrapped request is intended
 * to be handled by {@link createMultichainInvokedMethodMiddleware}, which must be
 * pushed onto the engine immediately after the middleware returned here.
 *
 * @param hooks - The hooks required by the MultiChain API method handlers.
 * @returns A JSON-RPC middleware that handles MultiChain API methods.
 */
export const createMultichainApiMethodMiddleware = (
  hooks: MultichainHandlerHooks,
) =>
  createMethodMiddleware({
    handlers: multichainMethodHandlers,
    hooks,
    onError,
  });

export const polyfillGasPrice = async (
  method: string,
  origin: string,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any[] = [],
) => {
  const networkClientId = Engine.controllerMessenger.call(
    'SelectedNetworkController:getNetworkClientIdForDomain',
    origin,
  );

  const networkClient = Engine.controllerMessenger.call(
    'NetworkController:getNetworkClientById',
    networkClientId,
  );

  const ethQuery = new EthQuery(networkClient.provider);

  const data = await query(ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};
export default {
  polyfillGasPrice,
};
