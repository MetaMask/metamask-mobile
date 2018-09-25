import React, { Component } from 'react';
import { View, AppState, AsyncStorage } from 'react-native';
import { createDrawerNavigator, createStackNavigator } from 'react-navigation';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Login from '../Login';
import QRScanner from '../QRScanner';
import CreatePassword from '../CreatePassword';
import ImportFromSeed from '../ImportFromSeed';
import LockScreen from '../LockScreen';
import Main from '../Main';
import AccountList from '../AccountList';
import Engine from '../../core/Engine';
import { baseStyles } from '../../styles/common';

const LOCK_TIMEOUT = 30000;

/**
 * Navigator object responsible for instantiating
 * the two top level views: Main and AccountList
 */

const MainNav = createStackNavigator(
	{
		Root: {
			screen: createDrawerNavigator(
				{
					Main: {
						screen: Main
					}
				},
				{
					contentComponent: AccountList
				}
			)
		},

		/** ALL FULL SCREEN MODALS SHOULD GO HERE */
		QRScanner: {
			screen: QRScanner
		}
	},
	{
		headerMode: 'none'
	}
);

/**
 * Root application component responsible for rendering
 * the first "guest" screens of the app:  CreatePassword, Login
 * It will  also render <Nav> only if the user is authenticated
 * and <LockScreen> if the app goes on background mode
 */
export default class App extends Component {
	state = {
		locked: true,
		loading: true,
		existingUser: false,
		loggedIn: false,
		appState: 'active',
		error: null,
		importFromSeed: false
	};

	mounted = true;

	async componentDidMount() {
		const existingUser = await AsyncStorage.getItem('@MetaMask:existingUser');
		if (existingUser !== null) {
			this.mounted && this.setState({ existingUser: true });
			this.unlockKeychain();
		} else {
			this.setState({ locked: false, loading: false });
		}

		AppState.addEventListener('change', this.handleAppStateChange);
	}

	componentWillUnmount() {
		this.mounted = false;
		AppState.removeEventListener('change', this.handleAppStateChange);
	}

	handleAppStateChange = async nextAppState => {
		if (nextAppState !== 'active') {
			await AsyncStorage.setItem('@MetaMask:bg_mode_ts', Date.now().toString());
		} else if (this.state.appState !== 'active' && nextAppState === 'active') {
			const bg_mode_ts = await AsyncStorage.getItem('@MetaMask:bg_mode_ts');
			if (bg_mode_ts && Date.now() - parseInt(bg_mode_ts) > LOCK_TIMEOUT) {
				// If it's still mounted, lock it
				this.mounted && this.setState({ locked: true });
				// And try to unlock it
				this.unlockKeychain();
			}
			AsyncStorage.removeItem('@MetaMask:bg_mode_ts');
		}
		this.mounted && this.setState({ appState: nextAppState });
	};

	async unlockKeychain() {
		try {
			// Retreive the credentials
			const { KeyringController } = Engine.context;
			const credentials = await Keychain.getGenericPassword();
			if (credentials) {
				// Restore vault with existing credentials
				await KeyringController.submitPassword(credentials.password);
				this.mounted && this.setState({ locked: false, existingUser: true, loading: false, loggedIn: true });
			} else {
				this.mounted && this.setState({ locked: false, existingUser: false, loggedIn: false, loading: false });
			}
		} catch (error) {
			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
			this.mounted && this.setState({ locked: false, existingUser: false, loggedIn: false, loading: false });
		}
	}

	onPasswordSaved = async pass => {
		const { KeyringController } = Engine.context;
		this.setState({ loading: true });
		try {
			await KeyringController.createNewVaultAndKeychain(pass);
			// mark the user as existing so it doesn't see the create password screen again
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: false, error: e.toString() });
		}
	};

	onImportFromSeed = async (pass, seed) => {
		const { KeyringController } = Engine.context;
		this.setState({ loading: true });
		try {
			await KeyringController.createNewVaultAndRestore(pass, seed);
			// mark the user as existing so it doesn't see the create password screen again
			await AsyncStorage.setItem('@MetaMask:existingUser', 'true');
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: false, error: e.toString() });
		}
	};

	onLogin = async password => {
		const { KeyringController } = Engine.context;
		try {
			// Restore vault with user entered password
			await KeyringController.submitPassword(password);
			this.setState({ locked: false, existingUser: true, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loading: false, loggedIn: false, error: e.toString() });
		}
	};

	toggleImportFromSeed = () => {
		this.setState({ importFromSeed: !this.state.importFromSeed });
	};

	render() {
		if (this.state.loggedIn) {
			return (
				<View style={baseStyles.flexGrow}>
					<MainNav />
					{this.state.locked ? <LockScreen /> : null}
				</View>
			);
		} else if (!this.state.existingUser) {
			if (this.state.importFromSeed) {
				return (
					<ImportFromSeed
						onImportFromSeed={this.onImportFromSeed}
						loading={this.state.loading}
						error={this.state.error}
						toggleImportFromSeed={this.toggleImportFromSeed}
					/>
				);
			}
			return (
				<CreatePassword
					onPasswordSaved={this.onPasswordSaved}
					loading={this.state.loading}
					error={this.state.error}
					toggleImportFromSeed={this.toggleImportFromSeed}
				/>
			);
		}

		if (this.state.loading) {
			return <LockScreen />;
		}

		return (
			<Login
				onLogin={this.onLogin}
				loading={this.state.loading}
				error={this.state.error}
				toggleImportFromSeed={this.toggleImportFromSeed}
			/>
		);
	}
}
