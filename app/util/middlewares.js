import Logger from './Logger';

const REJECTED_TRANSACTION_ERROR = 'User rejected the transaction';

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
 * Returns a middleware that logs RPC activity
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createLoggerMiddleware(opts) {
	return function loggerMiddleware(/** @type {any} */ req, /** @type {any} */ res, /** @type {Function} */ next) {
		next((/** @type {Function} */ cb) => {
			if (res.error) {
				const { error, ...resWithoutError } = res;
				if (error && error.message !== REJECTED_TRANSACTION_ERROR) {
					Logger.error(error, { message: 'Error in RPC response', res: resWithoutError });
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
