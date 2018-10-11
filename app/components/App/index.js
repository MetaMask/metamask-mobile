import { createSwitchNavigator, createDrawerNavigator, createStackNavigator } from 'react-navigation';
import Login from '../Login';
import QRScanner from '../QRScanner';
import Onboarding from '../Onboarding';
import CreateWallet from '../CreateWallet';
import ImportWallet from '../ImportWallet';
import ImportFromSeed from '../ImportFromSeed';
import SyncWithExtension from '../SyncWithExtension';
import SyncWithExtensionSuccess from '../SyncWithExtensionSuccess';
import AuthLoading from '../AuthLoading';
import LockScreen from '../LockScreen';
import Main from '../Main';
import AccountList from '../AccountList';

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
		},
		QRScanner: {
			screen: QRScanner
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
		},
		LockScreen: {
			screen: LockScreen
		}
	},
	{
		headerMode: 'none',
		mode: 'modal'
	}
);

export default createSwitchNavigator(
	{
		AuthLoading,
		HomeNav,
		OnboardingRootNav,
		Login,
		LockScreen
	},
	{
		initialRouteName: 'AuthLoading'
	}
);
