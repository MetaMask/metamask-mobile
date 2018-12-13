// eslint-disable-next-line import/default
import RNShake from 'react-native-shake';

export default class Feedback {
	constructor({ maxDelay, eventsRequired, action }) {
		this.count = 0;
		this.timer = null;
		this.maxDelay = maxDelay || 4000;
		this.action = action;
		this.eventsRequired = eventsRequired || 2;
		RNShake.addEventListener('ShakeEvent', this.onShake);
	}

	onShake = () => {
		this.count += 1;
		if (this.count === this.eventsRequired) {
			this.action.call();
			this.count = 0;
			clearInterval(this.timer);
		} else {
			this.timer = setTimeout(() => {
				this.count = 0;
			}, this.maxDelay);
		}
	};

	stopListening() {
		RNShake.removeEventListener('ShakeEvent');
	}
}
