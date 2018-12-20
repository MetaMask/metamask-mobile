import React, { Component } from 'react';
import { AppState } from 'react-native';
import PropTypes from 'prop-types';

import FoxScreen from '../FoxScreen';
import Engine from '../../core/Engine';
import SecureKeychain from '../../core/SecureKeychain';

/**
 * Main view component for the Lock screen
 */
export default class LockScreen extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	appState = 'active';
	locked = true;

	componentDidMount() {
		// Check if is the app is launching or it went to background mode
		const isBackgroundMode = this.props.navigation.getParam('backgroundMode', false);
		if (!isBackgroundMode) {
			// Because this is also the first screen
			// We need to wait for the engine to bootstrap before we can continue
			if (!Engine.context) {
				this.waitForEngine();
			} else {
				this.unlockKeychain();
			}
		} else {
			this.appState = 'background';
		}
		AppState.addEventListener('change', this.handleAppStateChange);
		this.mounted = true;
	}

	waitForEngine() {
		setTimeout(() => {
			Engine.context ? this.unlockKeychain() : this.waitForEngine();
		}, 100);
	}

	handleAppStateChange = async nextAppState => {
		// Try to unlock when coming from the background
		if (this.locked && this.appState !== 'active' && nextAppState === 'active') {
			this.appState = nextAppState;
			this.unlockKeychain();
		}
	};

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword(credentials.password);
				this.locked = false;
				this.props.navigation.goBack();
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
		}
	}

	render = () => <FoxScreen />;
}
