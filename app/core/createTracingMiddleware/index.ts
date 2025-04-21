import type {
  Json,
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import { trace, TraceName } from '../../util/trace';

export const MESSAGE_TYPE = {
  ETH_SIGN_TYPED_DATA: 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V1: 'eth_signTypedData_v1',
  ETH_SIGN_TYPED_DATA_V3: 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4: 'eth_signTypedData_v4',
  PERSONAL_SIGN: 'personal_sign',
  ADD_ETHEREUM_CHAIN: 'wallet_addEthereumChain',
  SWITCH_ETHEREUM_CHAIN: 'wallet_switchEthereumChain',
  WATCH_ASSET: 'wallet_watchAsset',
  ETH_REQUEST_ACCOUNTS: 'eth_requestAccounts',
  WALLET_CREATE_SESSION: 'wallet_createSession',
  WALLET_INVOKE_METHOD: 'wallet_invokeMethod',
  WALLET_GET_SESSION: 'wallet_getSession',
  WALLET_REVOKE_SESSION: 'wallet_revokeSession',
};

const METHOD_TYPE_TO_TRACE_NAME: Record<string, TraceName> = {
  [MESSAGE_TYPE.ETH_SIGN_TYPED_DATA]: TraceName.Signature,
  [MESSAGE_TYPE.ETH_SIGN_TYPED_DATA_V1]: TraceName.Signature,
  [MESSAGE_TYPE.ETH_SIGN_TYPED_DATA_V3]: TraceName.Signature,
  [MESSAGE_TYPE.ETH_SIGN_TYPED_DATA_V4]: TraceName.Signature,
  [MESSAGE_TYPE.PERSONAL_SIGN]: TraceName.Signature,
};

export default function createTracingMiddleware() {
  return async function tracingMiddleware(
    req: JsonRpcRequest<JsonRpcParams> & { traceContext?: unknown },
    _res: PendingJsonRpcResponse<Json>,
    next: () => void,
  ) {
    const { id, method } = req;

    const traceName = METHOD_TYPE_TO_TRACE_NAME[method];

    if (traceName) {
      req.traceContext = await trace({
        name: traceName,
        id: id as string,
      });

      await trace({
        name: TraceName.Middleware,
        id: id as string,
        parentContext: req.traceContext,
      });
    }

    next();
  };
}
