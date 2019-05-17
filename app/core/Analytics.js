/**
 * Singleton class to handle analytics through the app
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
			Analytics.instance = this;
		}
		this.enabled = enabled;
		this.listeners = [];
		return Analytics.instance;
	}

	/**
	 * Enable analytics
	 */
	enable = () => {
		this.enabled = true;
		this._notify();
	};

	/**
	 * Disable analytics
	 */
	disable = () => {
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
}

let instance;

export default {
	init(enabled) {
		instance = new Analytics(enabled);
		return instance;
	},
	enable() {
		return instance.enable();
	},
	disable() {
		return instance.disable();
	},
	getEnabled() {
		return instance.enabled;
	},
	subscribe(listener) {
		return instance.subscribe(listener);
	}
};
