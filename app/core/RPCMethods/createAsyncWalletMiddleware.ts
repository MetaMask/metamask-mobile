import {
  createWalletMiddleware,
  SendCalls,
  SendCallsResult,
} from '@metamask/eth-json-rpc-middleware';
import { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import { JsonRpcParams } from '@metamask/eth-query';
import { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import { v4 as uuidv4 } from 'uuid';

import Engine from '../Engine';

export const getAccounts = async () => {
  const { AccountsController } = Engine.context;
  const selectedAddress = AccountsController.getSelectedAccount()?.address;
  return Promise.resolve(selectedAddress ? [selectedAddress] : []);
};

export async function processSendCalls(
  params: SendCalls,
  req: JsonRpcRequest,
): Promise<SendCallsResult> {
  const { TransactionController, AccountsController } = Engine.context;
  const { calls, from: paramFrom } = params;
  const { networkClientId, origin } = req as JsonRpcRequest & {
    networkClientId: string;
    origin?: string;
  };
  const transactions = calls.map((call) => ({ params: call }));

  const from =
    paramFrom ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const { batchId: id } = await TransactionController.addTransactionBatch({
    from,
    networkClientId,
    origin,
    securityAlertId: uuidv4(),
    transactions,
    validateSecurity: () => Promise.resolve(),
  });

  return { id };
}

export const createAsyncWalletMiddleware = (): JsonRpcMiddleware<
  JsonRpcParams,
  Json
> =>
  createWalletMiddleware({
    getAccounts,
    processSendCalls,
  }) as JsonRpcMiddleware<JsonRpcParams, Json>;
