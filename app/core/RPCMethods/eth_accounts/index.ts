import {
  HandlerMiddlewareFunction,
  PermittedHandlerExport,
} from '@metamask/permission-controller';
import { JsonRpcParams, Json } from '@metamask/utils';
import { EthAccountHooks } from './types';
import { RestrictedMethods } from '../../Permissions/constants';

/**
 * Handler for eth_accounts
 *
 * @param _req - The JSON-RPC request object.
 * @param res - The JSON-RPC response object.
 * @param _next - The json-rpc-engine 'next' callback.
 * @param end -  The json-rpc-engine 'end' callback.
 * @param getAccounts - Implementation for getting accounts
 * @returns
 */
const ethAccountsHandler: HandlerMiddlewareFunction<
  EthAccountHooks,
  JsonRpcParams,
  Json
> = async (_req, res, _next, end, { getAccounts }) => {
  const permittedAccounts = await getAccounts();
  res.result = permittedAccounts;
  return end();
};

/**
 * Middleware handler for eth_accounts
 */
const handlerExport: PermittedHandlerExport<
  EthAccountHooks,
  JsonRpcParams,
  Json
> = {
  methodNames: [RestrictedMethods.eth_accounts],
  implementation: ethAccountsHandler,
  hookNames: {
    getAccounts: true,
  },
};

export default handlerExport;
