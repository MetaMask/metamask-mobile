import Logger from './Logger';

/**
 * Returns a middleware that appends the DApp origin to request
 * @param {{ origin: string }} opts - The middleware options
 * @returns {Function}
 */
export function createOriginMiddleware(opts) {
	return function originMiddleware(/** @type {any} */ req, /** @type {any} */ _, /** @type {Function} */ next) {
		req.origin = opts.origin;
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
				Logger.error('Error in RPC response:\n', res);
			}
			if (req.isMetamaskInternal) {
				return;
			}
			Logger.log(`RPC (${opts.origin}):`, req, '->', res);
			cb();
		});
	};
}
