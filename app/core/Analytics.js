'use strict';

import { NativeModules } from 'react-native';
const RCTAnalytics = NativeModules.Analytics;

/**
 * Class to handle analytics through the app
 */
class Analytics {
	/**
	 * Whether the manager has permission to send analytics
	 */
	enabled;

	/**
	 * State change callbacks
	 */
	listeners;

	/**
	 * Notifies subscribers of current enabled
	 */
	_notify = () => {
		this.listeners.forEach(listener => {
			listener(this.enabled);
		});
	};

	/**
	 * Creates a Analytics instance
	 */
	constructor(enabled) {
		if (!Analytics.instance) {
			this.enabled = enabled;
			this.listeners = [];
			Analytics.instance = this;
			RCTAnalytics.optIn(this.enabled);
		}
		return Analytics.instance;
	}

	/**
	 * Enable analytics
	 */
	enable = () => {
		this.enabled = true;
		RCTAnalytics.optIn(this.enabled);
		this._notify();
	};

	/**
	 * Disable analytics
	 */
	disable = () => {
		this.enabled = false;
		RCTAnalytics.optIn(this.enabled);
		this._notify();
	};

	/**
	 * Subscribe for enabled changes
	 *
	 * @param listener - Callback to add to listeners
	 */
	subscribe = listener => {
		this.listeners.push(listener);
	};

	/**
	 * Track event
	 *
	 * @param {object} event - Object containing event category, action and name
	 */
	trackEvent = event => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent(event);
		if (__DEV__) {
			console.log(`Analytics 'trackEvent' - `, event); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with value
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 */
	trackEventWithValue = (event, value) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			value
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithValue' -`, event, value); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with information
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {string} info - Information string to send with event
	 */
	trackEventWithInfo = (event, info) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			info
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithInfo' -`, event, info); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with value and information
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 * @param {string} info - Information string to send with event
	 */
	trackEventWithValueAndInfo = (event, value, info) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			value,
			info
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithValueAndInfo' - `, event, value, info); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with parameters
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {object} params - Object containing other params to send with event
	 */
	trackEventWithParameters = (event, params) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			...params
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithParameters' -`, event, params); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with value and parameters
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 * @param {object} params - Object containing other params to send with event
	 */
	trackEventWithValueAndParameters = (event, value, params) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			...params,
			value
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithValueAndParameters' -`, event, value, params); // eslint-disable-line no-console
		}
	};

	/**
	 * Track event with value and parameters
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 * @param {string} info - Information string to send with event
	 * @param {object} params - Object containing other params to send with event
	 */
	trackEventWithValueAndInfoAndParameters = (event, value, info, params) => {
		if (!this.enabled) return;
		RCTAnalytics.trackEvent({
			...event,
			...params,
			value,
			info
		});
		if (__DEV__) {
			console.log(`Analytics 'trackEventWithValueAndParameters' - `, event, value, info, params); // eslint-disable-line no-console
		}
	};
}

let instance;

export default {
	init(enabled) {
		instance = new Analytics(enabled);
		return instance;
	},
	enable() {
		return instance && instance.enable();
	},
	disable() {
		return instance && instance.disable();
	},
	getEnabled() {
		return instance && instance.enabled;
	},
	subscribe(listener) {
		return instance && instance.subscribe(listener);
	},
	trackEvent(event) {
		return instance && instance.trackEvent(event);
	},
	trackEventWithParameters(event, parameters) {
		return instance && instance.trackEventWithParameters(event, parameters);
	}
};
