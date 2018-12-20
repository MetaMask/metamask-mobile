// eslint-disable-next-line import/default
import { AppState } from 'react-native';

export default class BaseLockManager {
	constructor(navigation, lockTime) {
		this.navigation = navigation;
		this.backgroundSince = null;
		this.lockTime = lockTime;
		this.appState = 'active';
		AppState.addEventListener('change', this.handleAppStateChange);
	}

	updateLockTime(lockTime) {
		this.lockTime = lockTime;
	}

	stopListening() {
		AppState.removeEventListener('change', this.handleAppStateChange);
	}
}
