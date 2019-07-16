import {
	createSwitchNavigator,
	createDrawerNavigator,
	createStackNavigator,
	createAppContainer
} from 'react-navigation';
import Login from '../../Views/Login';
import QRScanner from '../../Views/QRScanner';
import Onboarding from '../../Views/Onboarding';
import CreateWallet from '../../Views/CreateWallet';
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
		},
		OptinMetrics: {
			screen: OptinMetrics
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
			)
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
const HomeNav = createDrawerNavigator(
	{
		Main: {
			screen: Main
		}
	},
	{
		contentComponent: DrawerView,
		drawerWidth: 315
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
		LockScreen
	},
	{
		initialRouteName: 'Entry'
	}
);

export default createAppContainer(App);
