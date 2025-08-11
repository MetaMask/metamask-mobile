import type {
  Json,
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import {
  TransactionController,
  TransactionParams,
  WalletDevice,
} from '@metamask/transaction-controller';
import { rpcErrors } from '@metamask/rpc-errors';
import ppomUtil, { PPOMRequest } from '../../lib/ppom/ppom-util';
import { updateConfirmationMetric } from '../redux/slices/confirmationMetrics';
import { store } from '../../store';

/**
 * A JavaScript object that is not `null`, a function, or an array.
 *
 * TODO: replace this with `RuntimeObject` from `@metamask/utils`
 */
type RuntimeObject = Record<PropertyKey, unknown>;

/**
 * A type guard for {@link RuntimeObject}.
 *
 * TODO: replace this with `isObject` from `@metamask/utils`
 *
 * @param value - The value to check.
 * @returns Whether the specified value has a runtime type of `object` and is
 * neither `null` nor an `Array`.
 */
function isObject(value: unknown): value is RuntimeObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A type guard for ensuring an object has a property.
 *
 * TODO: replace this with `hasProperty` from `@metamask/utils`
 *
 * @param objectToCheck - The object to check.
 * @param name - The property name to check for.
 * @returns Whether the specified object has an own property with the specified
 * name, regardless of whether it is enumerable or not.
 */
const hasProperty = <
  // eslint-disable-next-line @typescript-eslint/ban-types
  ObjectToCheck extends Object,
  Property extends PropertyKey,
>(
  objectToCheck: ObjectToCheck,
  name: Property,
): objectToCheck is ObjectToCheck & Record<Property, unknown> =>
  Object.hasOwnProperty.call(objectToCheck, name);

interface SendArgs {
  from: string;
  chainId?: number;
}

/**
 * Handle a `eth_sendTransaction` request.
 *
 * @param args - Named arguments.
 * @param args.hostname - The hostname associated with this request.
 * @param args.req - The JSON-RPC request.
 * @param args.res - The JSON-RPC response.
 * @param args.sendTransaction - A function that requests approval for the given transaction, then
 * signs the transaction and broadcasts it.
 * @param args.validateAccountAndChainId - A function that validates the account and chain ID
 * used in the transaction.
 */
async function eth_sendTransaction({
  hostname,
  req,
  res,
  sendTransaction,
  validateAccountAndChainId,
  analytics,
}: {
  hostname: string;
  req: JsonRpcRequest<[TransactionParams & JsonRpcParams]> & {
    method: 'eth_sendTransaction';
    networkClientId: string;
  };
  res: PendingJsonRpcResponse<Json>;
  sendTransaction: TransactionController['addTransaction'];
  validateAccountAndChainId: (args: SendArgs) => Promise<void>;
  analytics: { dapp_url?: string; request_source?: string };
}) {
  if (
    !Array.isArray(req.params) &&
    !(isObject(req.params) && hasProperty(req.params, 0))
  ) {
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: expected an array`,
    });
  }
  const transactionParameters = req.params[0];
  if (!isObject(transactionParameters)) {
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: expected the first parameter to be an object`,
    });
  }
  // TODO: Normalize chainId to Hex string
  const nChainId =
    typeof req.params[0].chainId === 'number'
      ? req.params[0].chainId
      : parseInt(req.params[0].chainId || '0x0', 16);
  await validateAccountAndChainId({
    from: req.params[0].from,
    chainId: nChainId,
  });

  const { result, transactionMeta } = await sendTransaction(req.params[0], {
    deviceConfirmedOn: WalletDevice.MM_MOBILE,
    networkClientId: req.networkClientId,
    origin: hostname,
  });

  ppomUtil.validateRequest(req as PPOMRequest, {
    transactionMeta,
  });

  const { id } = transactionMeta;
  store.dispatch(
    updateConfirmationMetric({
      id,
      params: {
        properties: { ...analytics },
      },
    }),
  );

  res.result = await result;
}

export default eth_sendTransaction;
