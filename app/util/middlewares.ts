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

interface MiddlewareOptions {
  origin: string;
}

/**
 * Returns a middleware that appends the DApp origin to request
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createOriginMiddleware(opts: MiddlewareOptions) {
  return function originMiddleware(
    /** @type {any} */ req: any,
    /** @type {any} */ _: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    /** @type {Function} */ next: Function,
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
export function containsUserRejectedError(
  errorMessage: string,
  errorCode?: number,
) {
  try {
    if (!errorMessage || !(typeof errorMessage === 'string')) return false;

    const userRejectedErrorMessage = USER_REJECTED_ERRORS.some(
      (userRejectedError) =>
        errorMessage.toLowerCase().includes(userRejectedError.toLowerCase()),
    );

    if (userRejectedErrorMessage) return true;

    if (errorCode === USER_REJECTED_ERROR_CODE) return true;

    return false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
}

/**
 * Returns a middleware that logs RPC activity
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createLoggerMiddleware(opts: MiddlewareOptions) {
  return function loggerMiddleware(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    /** @type {any} */ req: any,
    /** @type {any} */ res: any,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    /** @type {Function} */ next: Function,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    next((/** @type {Function} */ cb: Function) => {
      if (res.error) {
        const { error, ...resWithoutError } = res;
        if (error) {
          if (containsUserRejectedError(error.message, error.code)) {
            trackErrorAsAnalytics(
              `Error in RPC response: User rejected`,
              error.message,
            );
          } else {
            /**
             * Example of a rpc error:
             * { "code":-32603,
             * "message":"Internal JSON-RPC error.",
             * "data":{"code":-32000,"message":"gas required exceeds allowance (59956966) or always failing transaction"}
             * }
             * This will make the error log to sentry with the title "gas required exceeds allowance (59956966) or always failing transaction"
             * making it easier to differentiate each error.
             */
            const errorParams = {
              message: 'Error in RPC response',
              orginalError: error,
              res: resWithoutError,
              req,
              data: undefined,
            };

            if (error.data) {
              errorParams.data = error.data;
            }

            Logger.error(error, errorParams);
          }
        }
      }
      if (req.isMetamaskInternal) {
        return;
      }
      Logger.log(`RPC (${opts.origin}):`, req, '->', res);
      cb();
    });
  };
}
