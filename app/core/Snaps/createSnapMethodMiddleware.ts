import { handlers as permittedSnapMethods } from '@metamask/rpc-methods/dist/permitted';
import { selectHooks } from '@metamask/rpc-methods/dist/utils';
import { ethErrors } from 'eth-rpc-errors';

/*
 copied form extension
 https://github.com/MetaMask/metamask-extension/blob/develop/app/scripts/lib/rpc-method-middleware/createMethodMiddleware.js#L83
*/
const snapHandlerMap = permittedSnapMethods.reduce((map, handler) => {
  for (const methodName of handler.methodNames) {
    map.set(methodName, handler);
  }
  return map;
}, new Map());

// eslint-disable-next-line import/prefer-default-export
export function createSnapMethodMiddleware(isSnap: boolean, hooks: any) {
  return async function methodMiddleware(
    req: unknown,
    res: unknown,
    next: unknown,
    end: unknown,
  ) {
    const handler = snapHandlerMap.get(req.method);
    if (handler) {
      if (/^snap_/iu.test(req.method) && !isSnap) {
        return end(ethErrors.rpc.methodNotFound());
      }

      const { implementation, hookNames } = handler;
      try {
        // Implementations may or may not be async, so we must await them.
        return await implementation(
          req,
          res,
          next,
          end,
          selectHooks(hooks, hookNames),
        );
      } catch (error) {
        console.error(error);
        return end(error);
      }
    }
    return next();
  };
}
