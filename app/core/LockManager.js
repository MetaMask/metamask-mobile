import { AppState } from 'react-native';
import SecureKeychain from './SecureKeychain';
import BackgroundTimer from 'react-native-background-timer';
import Logger from '../util/Logger';
import Authentication from './Authentication';
import { trackErrorAsAnalytics } from '../util/analyticsV2';

export default class LockManager {
	constructor(lockTime) {
		this.navigateToLockScreen = undefined;
		this.selectedAddress = undefined;
		this.unlockAttempts = 0;
		this.locked = false;
		this.lockTime = lockTime;
		this.appState = 'active';
		AppState.addEventListener('change', this.handleAppStateChange);
	}

	updateLockTime(lockTime) {
		this.lockTime = lockTime;
	}

	setSelectedAddress(selectedAddress) {
		this.selectedAddress = selectedAddress;
	}

	handleAppStateChange = async (nextAppState) => {
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
				this.lockTimer = BackgroundTimer.setTimeout(() => {
					if (this.lockTimer) {
						this.lockApp();
					}
				}, this.lockTime);
			}
		} else if (this.appState !== 'active' && nextAppState === 'active') {
			// Prevent locking since it didnt reach the time threshold
			if (this.lockTimer) {
				BackgroundTimer.clearTimeout(this.lockTimer);
				this.lockTimer = null;
			}

			//Attemp to login if the app is locked and in the foreground
			if (this.locked) this.login();
		}

		this.appState = nextAppState;
	};

	login = async () => {
		this.unlockAttempts++;
		try {
			this.locked = false;
			await Authentication.appTriggeredAuth(this.selectedAddress);
		} catch (error) {
			if (this.unlockAttempts <= 3) {
				this.login();
			} else {
				trackErrorAsAnalytics(
					'LockApp: Max Attempts Reached',
					error?.message,
					`Unlock attempts: ${this.unlockAttempts}`
				);
				await Authentication.logout(false);
			}
		}
	};

	setLockedError = (error) => {
		Logger.log('Failed to lock KeyringController', error);
	};

	lockApp = async () => {
		if (!SecureKeychain.getInstance().isAuthenticating) {
			try {
				await Authentication.logout(false);
				this.locked = true;
				this.unlockAttempts = 0;
			} catch (e) {
				this.setLockedError(e);
			}
		} else if (this.lockTimer) {
			BackgroundTimer.clearTimeout(this.lockTimer);
			this.lockTimer = null;
		}
	};

	stopListening() {
		AppState.removeEventListener('change', this.handleAppStateChange);
	}
}
