import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import FoxScreen from '../FoxScreen';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

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
			const credentials = await Keychain.getGenericPassword({
				service: 'com.metamask',
				authenticationPromptTitle: strings('authentication.auth_prompt_title'),
				authenticationPromptDesc: strings('authentication.auth_prompt_desc'),
				fingerprintPromptTitle: strings('authentication.fingerprint_prompt_title'),
				fingerprintPromptDesc: strings('authentication.fingerprint_prompt_desc'),
				fingerprintPromptCancel: strings('authentication.fingerprint_prompt_cancel')
			});
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
