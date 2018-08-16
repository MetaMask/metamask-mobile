'use strict';

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
		args.unshift('[MetaMask DEBUG]:');
		console.log(...args); // eslint-disable-line no-console
	}

	/**
	 * console.error wrapper
	 *
	 * @param {object} args - data to be logged
	 * @returns - void
	 */
	static error(...args) {
		args.unshift('[MetaMask DEBUG]:');
		console.error(...args); // eslint-disable-line no-console
	}
}
