import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace

import FoxScreen from '../FoxScreen';
import Engine from '../../core/Engine';

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
		this.unlockKeychain();
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const { KeyringController } = Engine.context;
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				await KeyringController.submitPassword(credentials.password);
				this.props.navigation.goBack();
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
		}
	}

	render() {
		return <FoxScreen />;
	}
}
