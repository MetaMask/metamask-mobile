'use strict';

export default class Logger {
	static log(...args) {
		args.unshift('[MetaMask DEBUG]:');
		console.log(...args); // eslint-disable-line no-console
	}
}
