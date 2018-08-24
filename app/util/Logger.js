'use strict';
import { Crashlytics } from 'react-native-fabric';
import { Platform } from 'react-native';
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
			console.log(args); // eslint-disable-line no-console
		} else {
			Crashlytics.log(JSON.stringify(args));
		}
	}

	/**
	 * console.error wrapper
	 *
	 * @param {object} args - data to be logged
	 * @returns - void
	 */
	static error(...args) {
		if (__DEV__) {
			args.unshift('[MetaMask DEBUG]:');
			console.error(args); // eslint-disable-line no-console
		} else if (Platform.OS === 'android') {
			Crashlytics.logException(JSON.stringify(args));
		} else {
			Crashlytics.recordError(JSON.stringify(args));
		}
	}
}
