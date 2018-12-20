import { AppState } from 'react-native';
import SecureKeychain from './SecureKeychain';

export default class LockManager {
	constructor(navigation, lockTime) {
		this.navigation = navigation;
		this.lockTime = lockTime;
		this.appState = 'active';
		AppState.addEventListener('change', this.handleAppStateChange);
	}

	updateLockTime(lockTime) {
		this.lockTime = lockTime;
	}

	handleAppStateChange = async nextAppState => {
		// Don't auto-lock
		if (this.lockTime === -1) {
			return;
		}

		if (nextAppState !== 'active') {
			// Auto-lock immediately
			if (this.lockTime === 0) {
				this.lockApp();
			} else {
				// Autolock after some time
				this.lockTimer = setTimeout(() => {
					if (this.lockTimer) {
						this.lockApp();
					}
				}, this.lockTime);
			}
		} else if (this.appState !== 'active' && nextAppState === 'active') {
			// Prevent locking since it didnt reach the time threshold
			if (this.lockTimer) {
				clearTimeout(this.lockTimer);
				this.lockTimer = null;
			}
		}

		this.appState = nextAppState;
	};

	lockApp() {
		if (!SecureKeychain.getInstance().isAuthenticating) {
			this.navigation.navigate('LockScreen', { backgroundMode: true });
			this.locked = true;
		} else if (this.lockTimer) {
			clearTimeout(this.lockTimer);
			this.lockTimer = null;
		}
	}

	stopListening() {
		AppState.removeEventListener('change', this.handleAppStateChange);
	}
}
