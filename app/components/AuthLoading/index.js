import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AsyncStorage } from 'react-native';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import LockScreen from '../LockScreen';
import Engine from '../../core/Engine';
/**
 * Root application component responsible for rendering
 * the first "guest" screens of the app:  CreateWallet, Login
 * It will  also render <Nav> only if the user is authenticated
 * and <LockScreen> if the app goes on background mode
 */
export default class AuthLoading extends Component {
	static propTypes = {
		/**
		 * The navigator object
		 */
		navigation: PropTypes.object
	};

	async componentDidMount() {
		//await AsyncStorage.removeItem('@MetaMask:existingUser');
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
			const { KeyringController } = Engine.context;
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				await KeyringController.submitPassword(credentials.password);
				this.goToWallet();
			} else {
				this.goToLogin();
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
			this.goToOnboarding();
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

	render() {
		return <LockScreen />;
	}
}
