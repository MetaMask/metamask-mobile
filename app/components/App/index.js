import React, { Component } from 'react';
import { StyleSheet, AppState } from 'react-native';
import { createBottomTabNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import BrowserScreen from '../BrowserScreen';
import Engine from '../../core/Engine';
import WalletScreen from '../WalletScreen';
import fontelloConfig from '../../fonts/config.json';
import { colors } from '../../styles/common';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import CreatePassword from '../CreatePassword';
import LockScreen from '../LockScreen';

const Icon = createIconSetFromFontello(fontelloConfig);

const engine = new Engine();

/**
 * Root application component responsible for configuring app navigation
 * and instantiating the core Engine module
 */
const Nav = createBottomTabNavigator(
	{
		Home: {
			screen: BrowserScreen,
			navigationOptions: () => ({
				title: 'ÐApps',
				tabBarIcon: ico => <Icon name="dapp" size={18} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		},
		Wallet: {
			screen: function Home() {
				return <WalletScreen engine={engine} />;
			},
			navigationOptions: () => ({
				title: 'Wallet',
				tabBarIcon: ico => <Icon name="wallet" size={20} color={ico.tintColor} /> // eslint-disable-line react/display-name
			})
		}
	},
	{
		tabBarOptions: {
			activeTintColor: colors.primary,
			inactiveTintColor: colors.inactive,
			style: {
				borderTopWidth: StyleSheet.hairlineWidth
			}
		}
	}
);

export default class App extends Component {
	state = {
		locked: true,
		newUser: true,
		appState: 'active'
	};
	componentDidMount() {
		Keychain.resetGenericPassword();
		this.unlockKeychain();
		AppState.addEventListener('change', this._handleAppStateChange);
	}

	componentWillUnmount() {
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = nextAppState => {
		if (nextAppState !== 'active') {
			this.setState({ locked: true });
		} else if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
			this.state.locked && this.unlockKeychain();
		}
		this.setState({ appState: nextAppState });
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				this.setState({ locked: false, newUser: false });
			} else {
				this.setState({ locked: false, newUser: true });
			}
		} catch (error) {
			console.log("Keychain couldn't be accessed!", error); // eslint-disable-line
		}
	}

	onPasswordSaved = pass => {
		this.setState({ locked: false, newUser: false });
		// Here we should create the new vault
		engine.api.keyring.createNewVaultAndKeychain(pass);
	};

	render() {
		if (this.state.locked) {
			return <LockScreen />;
		} else if (this.state.newUser) {
			return <CreatePassword onPasswordSaved={this.onPasswordSaved} />;
		}

		return <Nav />;
	}
}
