// eslint-disable-next-line import/default
import RNShake from 'react-native-shake';

export default class Feedback {
	intervalBetweenEvents = 800;
	lastCall = null;

	constructor({ maxDelay, eventsRequired, action }) {
		this.count = 0;
		this.timer = null;
		this.maxDelay = maxDelay || 4000;
		this.action = action;
		this.eventsRequired = eventsRequired || 2;
		RNShake.addEventListener('ShakeEvent', this.onShake);
	}

	onShake = () => {
		this.lastEventReceived = Date.now();
		this.count += 1;
		if (this.count === this.eventsRequired) {
			if (!this.lastCall || Date.now() - this.lastCall > this.intervalBetweenEvents) {
				this.lastCall = Date.now();
				this.action.call();
				this.count = 0;
				clearTimeout(this.timer);
				this.timer = null;
			}
		} else {
			this.timer = setTimeout(() => {
				if (this.timer) {
					this.count = 0;
				}
			}, this.maxDelay);
		}
	};

	stopListening() {
		RNShake.removeEventListener('ShakeEvent');
	}
}
