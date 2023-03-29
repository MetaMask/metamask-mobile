import type {
  AsyncJsonRpcEngineNextCallback,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from 'json-rpc-engine';
import { ethErrors } from 'eth-json-rpc-errors';

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

/**
 * Handle a `eth_sendTransaction` request.
 *
 * @param args - Named arguments.
 * @param args.checkActiveAccountAndChainId - A function that validates the account and chain ID
 * used in the transaction.
 * @param args.req - The JSON-RPC request.
 * @param args.res - The JSON-RPC response.
 */
async function eth_sendTransaction({
  next,
  req,
  res: _res,
  validateAccountAndChainId,
}: {
  validateAccountAndChainId: (args: {
    from: string;
    chainId?: number;
  }) => Promise<void>;
  next: AsyncJsonRpcEngineNextCallback;
  req: JsonRpcRequest<unknown> & { method: 'eth_sendTransaction' };
  res: PendingJsonRpcResponse<unknown>;
}) {
  if (
    !Array.isArray(req.params) &&
    !(isObject(req.params) && hasProperty(req.params, 0))
  ) {
    throw ethErrors.rpc.invalidParams({
      message: `Invalid parameters: expected an array`,
    });
  }
  const transactionParameters = req.params[0];
  if (!isObject(transactionParameters)) {
    throw ethErrors.rpc.invalidParams({
      message: `Invalid parameters: expected the first parameter to be an object`,
    });
  }
  await validateAccountAndChainId({
    from: req.params[0].from,
    chainId: req.params[0].chainId,
  });

  // This is handled later in the network middleware
  next();
}

export default eth_sendTransaction;
