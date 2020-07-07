'use strict';

import { NativeModules } from 'react-native';
import Logger from '../util/Logger';
const RCTAnalytics = NativeModules.Analytics;

/**
 * Class to handle analytics through the app
 */
class Analytics {
	/**
	 * Variables defined in Mixpanel
	 */
	remoteVariables = {};
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
	 * Identify current user to mixpanel people
	 */
	_peopleIdentify = () => {
		RCTAnalytics.peopleIdentify();
	};

	/**
	 * Track event if enabled and not DEV mode
	 */
	_trackEvent(name, { event, params = {}, value, info }) {
		if (!this.enabled) return;
		if (!__DEV__) {
			RCTAnalytics.trackEvent({
				...event,
				...params,
				value,
				info
			});
		} else {
			Logger.log(`Analytics '${name}' -`, event, params, value, info);
		}
	}

	/**
	 * Creates a Analytics instance
	 */
	constructor(enabled) {
		if (!Analytics.instance) {
			this.enabled = enabled;
			this.listeners = [];
			Analytics.instance = this;
			if (!__DEV__) {
				RCTAnalytics.optIn(this.enabled);
				this._peopleIdentify();
			}
		}
		return Analytics.instance;
	}

	/**
	 * Enable analytics
	 */
	enable = () => {
		this.enabled = true;
		!__DEV__ && RCTAnalytics.optIn(this.enabled);
		this._notify();
	};

	/**
	 * Disable analytics
	 */
	disable = () => {
		this.enabled = false;
		!__DEV__ && RCTAnalytics.optIn(this.enabled);
		this._notify();
	};

	/**
	 * Disable analytics for the current class instance
	 * It will block sending events internally but it will keep RCTAnalytics enabled until app reload
	 */
	disableInstance = () => {
		this.enabled = false;
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
	 * Get current tracking id
	 */
	getDistinctId = async () => {
		const id = await RCTAnalytics.getDistinctId();
		return id;
	};

	/**
	 * Track event
	 *
	 * @param {object} event - Object containing event category, action and name
	 */
	trackEvent = event => {
		this._trackEvent('trackEvent', { event });
	};

	/**
	 * Track event with value
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 */
	trackEventWithValue = (event, value) => {
		this._trackEvent('trackEventWithValue', { event, value });
	};

	/**
	 * Track event with information
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {string} info - Information string to send with event
	 */
	trackEventWithInfo = (event, info) => {
		this._trackEvent('trackEventWithInfo', { event, info });
	};

	/**
	 * Track event with value and information
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 * @param {string} info - Information string to send with event
	 */
	trackEventWithValueAndInfo = (event, value, info) => {
		this._trackEvent('trackEventWithValueAndInfo', { event, value, info });
	};

	/**
	 * Track event with parameters
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {object} params - Object containing other params to send with event
	 */
	trackEventWithParameters = (event, params) => {
		this._trackEvent('trackEventWithParameters', { event, params });
	};

	/**
	 * Track event with value and parameters
	 *
	 * @param {object} event - Object containing event category, action and name
	 * @param {number} value - Value number to send with event
	 * @param {object} params - Object containing other params to send with event
	 */
	trackEventWithValueAndParameters = (event, value, params) => {
		this._trackEvent('trackEventWithValueAndParameters', { event, value, params });
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
		this._trackEvent('trackEventWithValueAndInfoAndParameters', { event, value, info, params });
	};
}

let instance;

export default {
	init: async enabled => {
		instance = new Analytics(enabled);
		try {
			const vars = await RCTAnalytics.getRemoteVariables();
			instance.remoteVariables = JSON.parse(vars);
		} catch (e) {
			// Do nothing
		}
		return instance;
	},
	enable() {
		return instance && instance.enable();
	},
	disable() {
		return instance && instance.disable();
	},
	disableInstance() {
		return instance && instance.disableInstance();
	},
	getEnabled() {
		if (__DEV__) {
			return false;
		}
		return instance && instance.enabled;
	},
	subscribe(listener) {
		return instance && instance.subscribe(listener);
	},
	getDistinctId() {
		return instance && instance.getDistinctId();
	},
	trackEvent(event) {
		return instance && instance.trackEvent(event);
	},
	trackEventWithParameters(event, parameters) {
		return instance && instance.trackEventWithParameters(event, parameters);
	},
	getRemoteVariables() {
		return instance.remoteVariables;
	},
	refreshRemoteVariables: async () => {
		try {
			const vars = await RCTAnalytics.getRemoteVariables();
			instance.remoteVariables = JSON.parse(vars);
		} catch (e) {
			// Do nothing
		}
	}
};
