import Logger from './Logger';
import trackErrorAsAnalytics from './metrics/TrackError/trackErrorAsAnalytics';

/**
 * List of rpc errors caused by the user rejecting a certain action.
 * Errors that include these phrases should not be logged to Sentry.
 * Examples of these errors include:
 * - User rejected the transaction
 * - User cancelled the transaction
 * - User rejected the request.
 * - MetaMask Message Signature: User denied message signature.
 * - MetaMask Personal Message Signature: User denied message signature.
 */
const USER_REJECTED_ERRORS = ['user rejected', 'user denied', 'user cancelled'];

const USER_REJECTED_ERROR_CODE = 4001;

/**
 * Returns a middleware that appends the DApp origin to request
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createOriginMiddleware(opts: { origin: string }): (req: unknown, _: unknown, next: () => void) => void {
  return function originMiddleware(
    /** @type {any} */ req,
    /** @type {any} */ _,
    /** @type {Function} */ next,
  ) {
    req.origin = opts.origin;

    // web3-provider-engine compatibility
    // TODO:provider delete this after web3-provider-engine deprecation
    if (!req.params) {
      req.params = [];
    }

    next();
  };
}

/**
 * Checks if the error code or message contains a user rejected error
 * @param {String} errorMessage
 * @returns {boolean}
 */
export function containsUserRejectedError(errorMessage: string, errorCode?: number): boolean {
  try {
    if (!errorMessage || !(typeof errorMessage === 'string')) return false;

    const userRejectedErrorMessage = USER_REJECTED_ERRORS.some(
      (userRejectedError) =>
        errorMessage.toLowerCase().includes(userRejectedError.toLowerCase()),
    );

    if (userRejectedErrorMessage) return true;

    if (errorCode === USER_REJECTED_ERROR_CODE) return true;

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Returns a middleware that logs RPC activity
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createLoggerMiddleware(opts: { origin: string }): (req: unknown, res: unknown, next: (cb: () => void) => void) => void {
  return function loggerMiddleware(
    req: unknown,
    res: unknown,
    next: (cb: () => void) => void,
  ) {
    next((cb: () => void) => {
      if (typeof res === 'object' && res !== null && 'error' in res) {
        const { error, ...resWithoutError } = res as { error: unknown };
        if (error) {
          if (typeof error === 'object' && 'message' in error && 'code' in error) {
            if (containsUserRejectedError(error.message as string, error.code as number)) {
              trackErrorAsAnalytics(
                `Error in RPC response: User rejected`,
                error.message as string,
              );
            } else {
              /**
               * Example of a rpc error:
               * { "code":-32603,
               *   "message":"Internal JSON-RPC error.",
               *   "data":{"code":-32000,"message":"gas required exceeds allowance (59956966) or always failing transaction"}
               * }
               * This will make the error log to sentry with the title "gas required exceeds allowance (59956966) or always failing transaction"
               * making it easier to differentiate each error.
               */
              const errorParams: {
                message: string;
                orginalError: unknown;
                res: unknown;
                req: unknown;
                data?: unknown;
              } = {
                message: 'Error in RPC response',
                orginalError: error,
                res: resWithoutError,
                req,
              };

              if (typeof error === 'object' && 'data' in error) {
                errorParams.data = error.data;
              }

              Logger.error(error, errorParams);
            }
          }
        }
      }
      if (typeof req === 'object' && req !== null && 'isMetamaskInternal' in req) {
        return;
      }
      Logger.log(`RPC (${opts.origin}):`, req, '->', res);
      cb();
    });
  };
}
