import React, { Component } from 'react';
import { View, AppState, AsyncStorage } from 'react-native';
import { createSwitchNavigator, createDrawerNavigator, createStackNavigator } from 'react-navigation';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import Login from '../Login';
import QRScanner from '../QRScanner';
import Onboarding from '../Onboarding';
import CreateWallet from '../CreateWallet';
import ImportWallet from '../ImportWallet';
import ImportFromSeed from '../ImportFromSeed';
import SyncWithExtension from '../SyncWithExtension';
import SyncWithExtensionSuccess from '../SyncWithExtensionSuccess';
import LockScreen from '../LockScreen';
import AuthLoading from '../AuthLoading';
import Main from '../Main';
import AccountList from '../AccountList';
import Engine from '../../core/Engine';

const LOCK_TIMEOUT = 30000;

/**
 * Navigator object responsible for instantiating
 * the two top level views: Main and AccountList
 */

const OnboardingNav = createStackNavigator(
	{
		Onboarding: {
			screen: Onboarding
		},
		CreateWallet: {
			screen: CreateWallet
		},
		ImportWallet: {
			screen: ImportWallet
		},
		ImportFromSeed: {
			screen: ImportFromSeed
		},
		SyncWithExtension: {
			screen: SyncWithExtension
		}
	},
	{
		initialRouteName: 'Onboarding'
	}
);

const OnboardingRootNav = createStackNavigator(
	{
		Onboarding: {
			screen: OnboardingNav
		},
		SyncWithExtensionSuccess: {
			screen: SyncWithExtensionSuccess
		}
	},
	{
		headerMode: 'none',
		mode: 'modal'
	}
);

const HomeNav = createStackNavigator(
	{
		Home: {
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

export default createSwitchNavigator(
	{
		AuthLoading,
		HomeNav,
		OnboardingRootNav,
		Login
	},
	{
		initialRouteName: 'AuthLoading'
	}
);

// export default class App extends Component {

// 	state = {
// 		locked: false
// 	};

// 	mounted = false;

// 	componentDidMount() {
// 		this.mounted = true;
// 	}

// 	componentWillUnmount() {
// 		this.mounted = false;
// 		AppState.removeEventListener('change', this.handleAppStateChange);
// 	}

// 	async unlockKeychain() {
// 		try {
// 			// Retreive the credentials
// 			const { KeyringController } = Engine.context;
// 			const credentials = await Keychain.getGenericPassword();
// 			if (credentials) {
// 				// Restore vault with existing credentials
// 				await KeyringController.submitPassword(credentials.password);
// 				this.setState({locked: false});
// 			}
// 		} catch (error) {
// 			console.log(`Keychain couldn't be accessed`, error); // eslint-disable-line
// 			this.goToOnboarding();
// 		}
// 	}

// 	handleAppStateChange = async nextAppState => {
// 		if (nextAppState !== 'active') {
// 			await AsyncStorage.setItem('@MetaMask:bg_mode_ts', Date.now().toString());
// 		} else if (this.state.appState !== 'active' && nextAppState === 'active') {
// 			const bg_mode_ts = await AsyncStorage.getItem('@MetaMask:bg_mode_ts');
// 			if (bg_mode_ts && Date.now() - parseInt(bg_mode_ts) > LOCK_TIMEOUT) {
// 				// If it's still mounted, lock it
// 				this.mounted && this.setState({ locked: true });
// 				// And try to unlock it
// 				this.unlockKeychain();
// 			}
// 			AsyncStorage.removeItem('@MetaMask:bg_mode_ts');
// 		}
// 		this.mounted && this.setState({ appState: nextAppState });
// 	}

// 	render () {
// 		return (
// 			<View>
// 				<SwitchNav />
// 				{ this.state.locked ? <LockScreen/> : null }
// 			</View>
// 		)
// 	}
// }
