import { query } from '@metamask/controller-utils';
import Engine from '../Engine';
import { selectHooks } from '@metamask/snaps-rpc-methods';
import { OptionalDataWithOptionalCause, rpcErrors } from '@metamask/rpc-errors';
import { JsonRpcMiddleware } from 'json-rpc-engine';
import { PermittedHandlerExport } from '@metamask/permission-controller';
import { Json, JsonRpcParams, hasProperty } from '@metamask/utils';

export const UNSUPPORTED_RPC_METHODS = new Set([
  // This is implemented later in our middleware stack – specifically, in
  // eth-json-rpc-middleware – but our UI does not support it.
  'eth_signTransaction' as const,
]);

/**
 * Asserts that the specified hooks object only has all expected hooks and no extraneous ones.
 *
 * @param hooks - Required "hooks" into our controllers.
 * @param - The expected hook names.
 */
function assertExpectedHook(
  hooks: Record<string, unknown>,
  expectedHookNames: Set<string>,
) {
  const missingHookNames: string[] = [];
  expectedHookNames.forEach((hookName) => {
    if (!hasProperty(hooks, hookName)) {
      missingHookNames.push(hookName);
    }
  });
  if (missingHookNames.length > 0) {
    throw new Error(
      `Missing expected hooks:\n\n${missingHookNames.join('\n')}\n`,
    );
  }
  const extraneousHookNames = Object.getOwnPropertyNames(hooks).filter(
    (hookName) => !expectedHookNames.has(hookName),
  );
  if (extraneousHookNames.length > 0) {
    throw new Error(
      `Received unexpected hooks:\n\n${extraneousHookNames.join('\n')}\n`,
    );
  }
}

/**
 * Creates a method middleware factory function given a set of method handlers.
 *
 * @param handlers - The RPC method handler implementations.
 * @returns The method middleware factory function.
 */
export function makeMethodMiddlewareMaker<U>(
  handlers: PermittedHandlerExport<U, JsonRpcParams, Json>[],
) {
  const handlerMap = handlers.reduce((map, handler) => {
    for (const methodName of handler.methodNames) {
      map[methodName] = handler;
    }
    return map;
  }, {} as Record<string, PermittedHandlerExport<U, JsonRpcParams, Json>>);

  const expectedHookNames = new Set(
    handlers.flatMap(({ hookNames }) => Object.getOwnPropertyNames(hookNames)),
  );

  /**
   * Creates a json-rpc-engine middleware of RPC method implementations.
   *
   * Handlers consume functions that hook into the background, and only depend
   * on their signatures, not e.g. controller internals.
   *
   * @param hooks - Required "hooks" into our controllers.
   * @returns - The method middleware function.
   */
  const makeMethodMiddleware = (hooks: Record<string, unknown>) => {
    assertExpectedHook(hooks, expectedHookNames);

    const methodMiddleware: JsonRpcMiddleware<JsonRpcParams, unknown> = async (
      req,
      res,
      next,
      end,
    ) => {
      const handler = handlerMap[req.method];
      if (handler) {
        const { implementation, hookNames } = handler;
        try {
          // Implementations may or may not be async, so we must await them.
          return await implementation(
            // @ts-expect-error JsonRpcId (number | string | void) doesn't match the permission middleware's id, which is (string | number | null)
            req,
            res,
            next,
            end,
            selectHooks(hooks, hookNames),
          );
        } catch (error) {
          if (process.env.METAMASK_DEBUG) {
            console.error(error);
          }
          return end(
            error instanceof Error
              ? error
              : rpcErrors.internal({
                  data: error as OptionalDataWithOptionalCause,
                }),
          );
        }
      }

      return next();
    };

    return methodMiddleware;
  };

  return makeMethodMiddleware;
}

export const polyfillGasPrice = async (method: string, params: any[] = []) => {
  const ethQuery = Engine.controllerMessenger.call(
    'NetworkController:getEthQuery',
  );
  // @ts-expect-error TODO: Handle case where this is called prior to initialization
  const data = await query(ethQuery, method, params);

  if (data?.maxFeePerGas && !data.gasPrice) {
    data.gasPrice = data.maxFeePerGas;
  }

  return data;
};

export default {
  polyfillGasPrice,
};
