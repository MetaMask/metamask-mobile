import React, { Component } from 'react';
import { View, AppState, AsyncStorage } from 'react-native';
import { createDrawerNavigator, createStackNavigator } from 'react-navigation';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Login from '../Login';
import QrScanner from '../QrScanner';
import CreatePassword from '../CreatePassword';
import ImportFromSeed from '../ImportFromSeed';
import LockScreen from '../LockScreen';
import Main from '../Main';
import AccountList from '../AccountList';
import Engine from '../../core/Engine';
import { baseStyles } from '../../styles/common';

/**
 * Navigator object responsible for instantiating
 * the two top level views: Main and AccountList
 */
const Home = createDrawerNavigator(
	{
		Main: {
			screen: Main
		}
	},
	{
		contentComponent: AccountList
	}
);

const MainNav = createStackNavigator(
	{
		Home: {
			screen: Home
		},
		/** ALL MODALS SHOULD GO HERE */
		QrScanner: {
			screen: QrScanner
		}
	},
	{
		mode: 'modal',
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

	handleAppStateChange = nextAppState => {
		if (nextAppState !== 'active') {
			this.mounted && this.setState({ locked: true });
		} else if (this.state.appState.match(/background/) && nextAppState === 'active') {
			this.state.locked && this.unlockKeychain();
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
			this.setState({ locked: false, existingUser: false, loggedIn: false, loading: false, error: e.toString() });
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
			this.setState({ locked: false, existingUser: false, loggedIn: false, error: e.toString() });
		}
	};

	onLogin = async password => {
		const { KeyringController } = Engine.context;
		try {
			// Restore vault with user entered password
			await KeyringController.submitPassword(password);
			this.setState({ locked: false, existingUser: true, loading: false, loggedIn: true });
		} catch (e) {
			this.setState({ locked: false, existingUser: false, loggedIn: false, error: e.toString() });
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
