import React, { Component } from 'react';
import { StyleSheet, AppState, AsyncStorage } from 'react-native';
import { createBottomTabNavigator } from 'react-navigation';
import { createIconSetFromFontello } from 'react-native-vector-icons';
import BrowserScreen from '../BrowserScreen';
import Engine from '../../core/Engine';
import WalletScreen from '../WalletScreen';
import fontelloConfig from '../../fonts/config.json';
import { colors } from '../../styles/common';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Login from '../Login';
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
			screen: function Home() {
				return <BrowserScreen engine={engine} />;
			},
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
		loading: false,
		existingUser: false,
		loggedIn: false,
		appState: 'active',
		error: null
	};

	mounted = true;

	async componentDidMount() {
		Keychain.resetGenericPassword();
		const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
		if (existingUser !== null) {
			this.setState({ existingUser: true });
		}

		this.unlockKeychain();
		AppState.addEventListener('change', this._handleAppStateChange);
	}

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this._handleAppStateChange);
	}

	_handleAppStateChange = nextAppState => {
		if (nextAppState !== 'active') {
			this.mounted && this.setState({ locked: true, loggedIn: false });
		} else if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
			this.state.locked && this.unlockKeychain();
		}
		this.mounted && this.setState({ appState: nextAppState });
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				await engine.api.keyring.submitPassword(credentials.password);
				//const accounts = await engine.api.keyring.keyring.getAccounts();
				this.mounted && this.setState({ locked: false, existingUser: true, loading: false, loggedIn: true });
			} else {
				this.mounted && this.setState({ locked: false, existingUser: false, loggedIn: false });
			}
		} catch (error) {
			console.log("Keychain couldn't be accessed!", error); // eslint-disable-line
			this.mounted && this.setState({ locked: false, existingUser: false, loggedIn: false });
		}
	}

	onPasswordSaved = async pass => {
		// Here we should create the new vault
		this.setState({ loading: true });
		try {
			await engine.api.keyring.createNewVaultAndKeychain(pass);
			// mark the user as existing so it doesn't see the create password screen again
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			//const accounts = await engine.api.keyring.keyring.getAccounts();
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loggedIn: false, error: e.toString() });
		}
	};

	onLogin = async password => {
		try {
			// Restore vault with user entered password
			await engine.api.keyring.submitPassword(password);
			this.setState({ locked: false, existingUser: true, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loggedIn: false, error: e.toString() });
		}
	};

	render() {
		if (this.state.loggedIn) {
			return <Nav />;
		} else if (this.state.locked) {
			return <LockScreen />;
		} else if (!this.state.existingUser) {
			return (
				<CreatePassword
					onPasswordSaved={this.onPasswordSaved}
					loading={this.state.loading}
					error={this.state.error}
				/>
			);
		}

		return <Login onLogin={this.onLogin} loading={this.state.loading} error={this.state.error} />;
	}
}
