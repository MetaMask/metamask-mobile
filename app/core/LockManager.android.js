import { AppState } from 'react-native';
import SecureKeychain from './SecureKeychain';

export default class LockManager {
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

	handleAppStateChange = async nextAppState => {
		// Don't auto-lock
		if (this.lockTime === -1) {
			return;
		}

		if (nextAppState !== 'active') {
			// Auto-lock immediately
			if (this.lockTime === 0) {
				this.lockApp(true);
			} else {
				// Autolock after some time
				this.backgroundSince = Date.now();
			}
		} else if (this.appState !== 'active' && nextAppState === 'active') {
			if (this.backgroundSince && Date.now() - this.backgroundSince > this.lockTime) {
				this.lockApp();
			} else {
				this.backgroundSince = null;
			}
		}

		this.appState = nextAppState;
	};

	lockApp(immediately = false) {
		if (!SecureKeychain.getInstance().isAuthenticating) {
			this.navigation.navigate('LockScreen', immediately ? { backgroundMode: true } : null);
		}
	}

	stopListening() {
		AppState.removeEventListener('change', this.handleAppStateChange);
	}
}
