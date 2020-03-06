'use strict';

import { addBreadcrumb, captureException, withScope } from '@sentry/react-native';

/**
 * Wrapper class that allows us to override
 * console.log and console.error and in the future
 * we will have flags to do different actions based on
 * the environment, for ex. log to a remote server if prod
 */
export default class Logger {
	/**
	 * console.log wrapper
	 *
	 * @param {object} args - data to be logged
	 * @returns - void
	 */
	static log(...args) {
		if (__DEV__) {
			args.unshift('[MetaMask DEBUG]:');
			console.log.apply(null, args); // eslint-disable-line no-console
		} else {
			addBreadcrumb({
				message: JSON.stringify(args)
			});
		}
	}

	/**
	 * console.error wrapper
	 *
	 * @param {Error} error - error to be logged
	 * @param {string|object} extra - Extra error info
	 * @returns - void
	 */
	static error(error, extra) {
		if (__DEV__) {
			console.warn('[MetaMask DEBUG]:', error); // eslint-disable-line no-console
		} else if (extra) {
			if (typeof extra === 'string') {
				extra = { message: extra };
			}
			withScope(scope => {
				scope.setExtras(extra);
				captureException(error);
			});
		} else {
			captureException(error);
		}
	}
}
