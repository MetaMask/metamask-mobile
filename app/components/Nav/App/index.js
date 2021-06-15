import React, { useEffect, useRef } from 'react';
import { createAppContainer, createSwitchNavigator, NavigationActions } from 'react-navigation';

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
import ImportFromSeed from '../../Views/ImportFromSeed';
import SyncWithExtensionSuccess from '../../Views/SyncWithExtensionSuccess';
import Entry from '../../Views/Entry';
import LockScreen from '../../Views/LockScreen';
import Main from '../Main';
import DrawerView from '../../UI/DrawerView';
import OptinMetrics from '../../UI/OptinMetrics';
import SimpleWebview from '../../Views/SimpleWebview';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import Branch from 'react-native-branch';
import AppConstants from '../../../core/AppConstants';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';

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
		ImportFromSeed: {
			screen: ImportFromSeed
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
const AppNavigator = createSwitchNavigator(
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

const AppContainer = createAppContainer(AppNavigator);

const App = () => {
	const unsubscribeFromBranch = useRef();
	const navigator = useRef();

	const handleDeeplinks = ({ error, params, uri }) => {
		if (error) {
			if (error === 'Trouble reaching the Branch servers, please try again shortly.') {
				trackErrorAsAnalytics(error, 'Branch: Trouble reaching servers');
			} else {
				trackErrorAsAnalytics(error, 'Deeplink: Error from Branch');
			}
		}
		const deeplink = params['+non_branch_link'] || uri || null;
		try {
			if (deeplink) {
				const { KeyringController } = Engine.context;
				const isUnlocked = KeyringController.isUnlocked();
				isUnlocked
					? SharedDeeplinkManager.parse(deeplink, { origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK })
					: SharedDeeplinkManager.setDeeplink(deeplink);
			}
		} catch (e) {
			Logger.error(e, `Deeplink: Error parsing deeplink`);
		}
	};

	useEffect(() => {
		SharedDeeplinkManager.init({
			navigate: (routeName, opts) => {
				navigator.current.dispatch(NavigationActions.navigate({ routeName, params: opts }));
			}
		});

		unsubscribeFromBranch.current = Branch.subscribe(handleDeeplinks);

		return () => unsubscribeFromBranch.current?.();
	}, []);

	return <AppContainer ref={navigator} />;
};
export default App;
