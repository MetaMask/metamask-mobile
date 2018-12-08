import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage } from 'react-native';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Engine from '../../core/Engine';
import FoxScreen from '../FoxScreen';
import { strings } from '../../../locales/i18n';
/**
 * Entry Screen that decides which screen to show
 * depending on the state of the user
 * new, existing , logged in or not
 * while showing the fox
 */
export default class Entry extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	async componentDidMount() {
		const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
		if (existingUser !== null) {
			await this.unlockKeychain();
		} else {
			this.goToOnboarding();
		}
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
				this.goToWallet();
			} else {
				this.goToLogin();
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
			this.goToLogin();
		}
	}

	goToOnboarding() {
		this.props.navigation.navigate('OnboardingRootNav');
	}

	goToWallet() {
		this.props.navigation.navigate('HomeNav');
	}

	goToLogin() {
		this.props.navigation.navigate('Login');
	}

	render = () => <FoxScreen />;
}
