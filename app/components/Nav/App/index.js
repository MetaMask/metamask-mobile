import React, { PureComponent } from 'react';

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
import { createSwitchNavigator } from '@react-navigation/compat';

import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
const Stack = createStackNavigator();
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();
/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet, Import from Seed and Sync
 */
const OnboardingNav = () => (
	<Stack.Navigator initialRouteName="OnboardingCarousel">
		<Stack.Screen name="Onboarding" component={Onboarding} options={Onboarding.navigationOptions} />
		<Stack.Screen
			name="OnboardingCarousel"
			component={OnboardingCarousel}
			options={OnboardingCarousel.navigationOptions}
		/>
		<Stack.Screen name="CreateWallet" component={CreateWallet} options={CreateWallet.navigationOptions} />
		<Stack.Screen name="ChoosePassword" component={ChoosePassword} options={ChoosePassword.navigationOptions} />
		<Stack.Screen
			name="AccountBackupStep1"
			component={AccountBackupStep1}
			options={AccountBackupStep1.navigationOptions}
		/>
		<Stack.Screen
			name="AccountBackupStep1B"
			component={AccountBackupStep1B}
			options={AccountBackupStep1B.navigationOptions}
		/>
		<Stack.Screen
			name="ManualBackupStep1"
			component={ManualBackupStep1}
			options={ManualBackupStep1.navigationOptions}
		/>
		<Stack.Screen
			name="ManualBackupStep2"
			component={ManualBackupStep2}
			options={ManualBackupStep2.navigationOptions}
		/>
		<Stack.Screen
			name="ManualBackupStep3"
			component={ManualBackupStep3}
			options={ManualBackupStep3.navigationOptions}
		/>
		<Stack.Screen name="ImportFromSeed" component={ImportFromSeed} options={ImportFromSeed.navigationOptions} />
		<Stack.Screen name="OptinMetrics" component={OptinMetrics} options={OptinMetrics.navigationOptions} />
	</Stack.Navigator>
);

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const SimpleWebviewScreen = () => (
	<Stack.Navigator mode={'modal'}>
		<Stack.Screen name="SimpleWebview" component={SimpleWebview} options={SimpleWebview.navigationOptions} />
	</Stack.Navigator>
);

const OnboardingRootNav = () => (
	<Stack.Navigator mode="modal" screenOptions={{ headerShown: false }}>
		<Stack.Screen name="OnboardingNav" component={OnboardingNav} />
		<Stack.Screen name="SyncWithExtensionSuccess" component={SyncWithExtensionSuccess} />
		<Stack.Screen name="QRScanner" component={QRScanner} header={null} />
		<Stack.Screen name="Webview" header={null} component={SimpleWebviewScreen} />
	</Stack.Navigator>
);

/**
 * Main app navigator which handles all the screens
 * after the user is already onboarded
 */

const HomeNav = () => (
	<Drawer.Navigator
		drawerContent={props => <DrawerView {...props} />}
		// eslint-disable-next-line
		drawerStyle={{
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			width: 315
		}}
	>
		<Drawer.Screen name="Main" component={Main} />
	</Drawer.Navigator>
);

// Is this necessary?
/**
 * Drawer status tracking
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
*/

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

class App extends PureComponent {
	unsubscribeFromBranch;

	componentDidMount = () => {
		SharedDeeplinkManager.init({
			navigate: (name, opts) => {
				this.navigator.dispatch(CommonActions.navigate({ name, params: opts }));
			}
		});
		if (!this.unsubscribeFromBranch) {
			this.unsubscribeFromBranch = Branch.subscribe(this.handleDeeplinks);
		}
	};

	handleDeeplinks = async ({ error, params, uri }) => {
		if (error) {
			if (error === 'Trouble reaching the Branch servers, please try again shortly.') {
				trackErrorAsAnalytics('Branch: Trouble reaching servers', error);
			} else {
				Logger.error(error, 'Deeplink: Error from Branch');
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

	componentWillUnmount = () => {
		this.unsubscribeFromBranch && this.unsubscribeFromBranch();
	};

	render() {
		return (
			<NavigationContainer
				ref={nav => {
					this.navigator = nav;
				}}
			>
				<AppNavigator />
			</NavigationContainer>
		);
	}
}
export default App;
