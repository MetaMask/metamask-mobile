import {
	createSwitchNavigator,
	createDrawerNavigator,
	createStackNavigator,
	createAppContainer
} from 'react-navigation';
import Login from '../Login';
import QRScanner from '../QRScanner';
import Onboarding from '../Onboarding';
import CreateWallet from '../CreateWallet';
import ImportWallet from '../ImportWallet';
import ImportFromSeed from '../ImportFromSeed';
import SyncWithExtension from '../SyncWithExtension';
import SyncWithExtensionSuccess from '../SyncWithExtensionSuccess';
import Entry from '../Entry';
import LockScreen from '../LockScreen';
import Main from '../Main';
import DrawerView from '../DrawerView';
import TransactionSubmitted from '../TransactionSubmitted';

/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet, Import from Seed and Sync
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

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
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

/**
 * Main app navigator which handles all the screens
 * after the user is already onboarded
 */
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
					contentComponent: DrawerView,
					drawerWidth: 315
				}
			)
		},
		/** ALL FULL SCREEN MODALS SHOULD GO HERE */
		QRScanner: {
			screen: QRScanner
		},
		LockScreen: {
			screen: LockScreen
		},
		TransactionSubmitted: {
			screen: TransactionSubmitted
		}
	},
	{
		headerMode: 'none',
		mode: 'modal'
	}
);

/**
 * Top level switch navigator which decides
 * which top level view to show
 */
const App = createSwitchNavigator(
	{
		Entry,
		HomeNav,
		OnboardingRootNav,
		Login,
		LockScreen
	},
	{
		initialRouteName: 'Entry'
	}
);

export default createAppContainer(App);
