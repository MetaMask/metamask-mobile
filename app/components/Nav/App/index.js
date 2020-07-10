import {
	// eslint-disable-next-line import/named
	createAppContainer,
	// eslint-disable-next-line import/named
	createSwitchNavigator
} from 'react-navigation';

import { createStackNavigator } from 'react-navigation-stack';
import { createDrawerNavigator } from 'react-navigation-drawer';
import Login from '../../Views/Login';
import QRScanner from '../../Views/QRScanner';
import Onboarding from '../../Views/Onboarding';
import OnboardingCarousel from '../../Views/OnboardingCarousel';
import CreateWallet from '../../Views/CreateWallet';
import ChoosePassword from '../../Views/ChoosePassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ImportWallet from '../../Views/ImportWallet';
import ImportFromSeed from '../../Views/ImportFromSeed';
import SyncWithExtension from '../../Views/SyncWithExtension';
import SyncWithExtensionSuccess from '../../Views/SyncWithExtensionSuccess';
import Entry from '../../Views/Entry';
import LockScreen from '../../Views/LockScreen';
import Main from '../Main';
import DrawerView from '../../UI/DrawerView';
import OptinMetrics from '../../UI/OptinMetrics';
import SimpleWebview from '../../Views/SimpleWebview';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';

/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet, Import from Seed and Sync
 */
const OnboardingNav = createStackNavigator(
	{
		Onboarding: {
			screen: Onboarding
		},
		OnboardingCarousel: {
			screen: OnboardingCarousel
		},
		CreateWallet: {
			screen: CreateWallet
		},
		ChoosePassword: {
			screen: ChoosePassword
		},
		AccountBackupStep1: {
			screen: AccountBackupStep1
		},
		AccountBackupStep1B: {
			screen: AccountBackupStep1B
		},
		ManualBackupStep1: {
			screen: ManualBackupStep1
		},
		ManualBackupStep2: {
			screen: ManualBackupStep2
		},
		ManualBackupStep3: {
			screen: ManualBackupStep3
		},
		ImportWallet: {
			screen: ImportWallet
		},
		ImportFromSeed: {
			screen: ImportFromSeed
		},
		SyncWithExtension: {
			screen: SyncWithExtension
		},
		OptinMetrics: {
			screen: OptinMetrics
		}
	},
	{
		initialRouteName: 'OnboardingCarousel'
	}
);

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const OnboardingRootNav = createStackNavigator(
	{
		OnboardingNav: {
			screen: OnboardingNav,
			navigationOptions: {
				header: null
			}
		},
		SyncWithExtensionSuccess: {
			screen: SyncWithExtensionSuccess
		},
		QRScanner: {
			screen: QRScanner,
			navigationOptions: {
				header: null
			}
		},
		Webview: {
			screen: createStackNavigator(
				{
					SimpleWebview: {
						screen: SimpleWebview
					}
				},
				{
					mode: 'modal'
				}
			),
			navigationOptions: {
				header: null
			}
		}
	},
	{
		mode: 'modal'
	}
);

/**
 * Main app navigator which handles all the screens
 * after the user is already onboarded
 */
const HomeNav = createDrawerNavigator(
	{
		Main: {
			screen: Main
		}
	},
	{
		contentComponent: DrawerView,
		drawerWidth: 315,
		overlayColor: 'rgba(0, 0, 0, 0.5)'
	}
);

/**
 * Drawer status tracking
 */
const defaultGetStateForAction = HomeNav.router.getStateForAction;
DrawerStatusTracker.init();
HomeNav.router.getStateForAction = (action, state) => {
	if (action) {
		if (action.type === 'Navigation/MARK_DRAWER_SETTLING' && action.willShow) {
			DrawerStatusTracker.setStatus('open');
		} else if (action.type === 'Navigation/MARK_DRAWER_SETTLING' && !action.willShow) {
			DrawerStatusTracker.setStatus('closed');
		}
	}

	return defaultGetStateForAction(action, state);
};

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
		OnboardingCarousel,
		LockScreen
	},
	{
		initialRouteName: 'Entry'
	}
);

export default createAppContainer(App);
