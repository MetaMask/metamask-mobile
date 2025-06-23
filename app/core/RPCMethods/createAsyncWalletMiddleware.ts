import {
  createWalletMiddleware,
  SendCalls,
  SendCallsResult,
} from '@metamask/eth-json-rpc-middleware';
import { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import { JsonRpcParams } from '@metamask/eth-query';
import { Hex, Json, JsonRpcRequest } from '@metamask/utils';
import { JsonRpcError, rpcErrors } from '@metamask/rpc-errors';
import { v4 as uuidv4 } from 'uuid';

import ppomUtil from '../../lib/ppom/ppom-util';
import Engine from '../Engine';

const VERSION = '2.0.0';

enum EIP5792ErrorCode {
  UnsupportedNonOptionalCapability = 5700,
  UnsupportedChainId = 5710,
  UnknownBundleId = 5730,
  RejectedUpgrade = 5750,
}

type JSONRPCRequest = JsonRpcRequest & {
  networkClientId: string;
  origin?: string;
};

export const getAccounts = async () => {
  const { AccountsController } = Engine.context;
  const selectedAddress = AccountsController.getSelectedAccount()?.address;
  return Promise.resolve(selectedAddress ? [selectedAddress] : []);
};

function validateSendCallsVersion(sendCalls: SendCalls) {
  const { version } = sendCalls;

  if (version !== VERSION) {
    throw rpcErrors.invalidInput(
      `Version not supported: Got ${version}, expected ${VERSION}`,
    );
  }
}

async function validateSendCallsChainId(
  sendCalls: SendCalls,
  req: JSONRPCRequest,
) {
  const { TransactionController, AccountsController } = Engine.context;
  const { chainId } = sendCalls;
  const { networkClientId } = req;

  const dappChainId = Engine.controllerMessenger.call(
    'NetworkController:getNetworkClientById',
    networkClientId,
  ).configuration.chainId;

  if (chainId && chainId.toLowerCase() !== dappChainId.toLowerCase()) {
    throw rpcErrors.invalidParams(
      `Chain ID must match the dApp selected network: Got ${chainId}, expected ${dappChainId}`,
    );
  }

  const from =
    sendCalls.from ?? (AccountsController.getSelectedAccount()?.address as Hex);

  const batchSupport = await TransactionController.isAtomicBatchSupported({
    address: from,
    chainIds: [dappChainId],
  });

  const chainBatchSupport = batchSupport?.[0];

  if (!chainBatchSupport) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnsupportedChainId,
      `EIP-7702 not supported on chain: ${dappChainId}`,
    );
  }
}

function validateCapabilities(sendCalls: SendCalls) {
  const { calls, capabilities } = sendCalls;

  const requiredTopLevelCapabilities = Object.keys(capabilities ?? {}).filter(
    (name) => capabilities?.[name].optional !== true,
  );

  const requiredCallCapabilities = calls.flatMap((call) =>
    Object.keys(call.capabilities ?? {}).filter(
      (name) => call.capabilities?.[name].optional !== true,
    ),
  );

  const requiredCapabilities = [
    ...requiredTopLevelCapabilities,
    ...requiredCallCapabilities,
  ];

  if (requiredCapabilities.length) {
    throw new JsonRpcError(
      EIP5792ErrorCode.UnsupportedNonOptionalCapability,
      `Unsupported non-optional capabilities: ${requiredCapabilities.join(
        ', ',
      )}`,
    );
  }
}

async function validateSendCalls(sendCalls: SendCalls, req: JSONRPCRequest) {
  validateSendCallsVersion(sendCalls);
  await validateSendCallsChainId(sendCalls, req);
  validateCapabilities(sendCalls);
}

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

  await validateSendCalls(params, req as JSONRPCRequest);

  const from =
    paramFrom ?? (AccountsController.getSelectedAccount()?.address as Hex);
  const securityAlertId = uuidv4();

  const { batchId: id } = await TransactionController.addTransactionBatch({
    from,
    networkClientId,
    origin,
    securityAlertId,
    transactions,
    validateSecurity:
      ppomUtil.createValidatorForSecurityAlertId(securityAlertId),
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
