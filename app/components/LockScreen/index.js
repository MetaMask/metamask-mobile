import React, { Component } from 'react';
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

	componentDidMount() {
		this.mounted = true;
		// Because this is also the first screen
		// We need to wait for the engine to bootstrap before we can continue
		if (!Engine.context) {
			this.waitForEngine();
		} else {
			this.unlockKeychain();
		}
	}

	waitForEngine() {
		setTimeout(() => {
			Engine.context ? this.unlockKeychain() : this.waitForEngine();
		}, 100);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await SecureKeychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				const { KeyringController } = Engine.context;
				await KeyringController.submitPassword(credentials.password);
				this.props.navigation.goBack();
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
		}
	}

	render = () => <FoxScreen />;
}
