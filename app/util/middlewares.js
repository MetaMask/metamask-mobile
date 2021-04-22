import Logger from './Logger';

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
export function createOriginMiddleware(opts) {
	return function originMiddleware(/** @type {any} */ req, /** @type {any} */ _, /** @type {Function} */ next) {
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
function containsUserRejectedError(errorMessage, errorCode) {
	try {
		if (!errorMessage || !errorMessage.includes || !errorMessage.toLowerCase) return false;

		const userRejectedErrorMessage = USER_REJECTED_ERRORS.some(userRejectedError =>
			errorMessage.toLowerCase().includes(userRejectedError.toLowerCase())
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
export function createLoggerMiddleware(opts) {
	return function loggerMiddleware(/** @type {any} */ req, /** @type {any} */ res, /** @type {Function} */ next) {
		next((/** @type {Function} */ cb) => {
			if (res.error) {
				const { error, ...resWithoutError } = res;
				if (error) {
					if (containsUserRejectedError(error.message, error.code)) {
						//TODO After merging PR 2529, use return trackErrorAsAnalytics(`Error in RPC response: User rejected`, error.message);
					} else {
						let errorToLog = error;
						if (error.data && error.data.message) {
							errorToLog = new Error(error.data.message);
						}
						Logger.error(errorToLog, {
							message: error.message,
							res: resWithoutError,
							data: error.data
						});
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
