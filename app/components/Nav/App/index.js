import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { Animated, StyleSheet, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-community/async-storage';
import Login from '../../Views/Login';
import QRScanner from '../../Views/QRScanner';
import Onboarding from '../../Views/Onboarding';
import OnboardingCarousel from '../../Views/OnboardingCarousel';
import ChoosePassword from '../../Views/ChoosePassword';
import ExtensionSync from '../../Views/ExtensionSync';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ImportFromSeed from '../../Views/ImportFromSeed';
import SyncWithExtensionSuccess from '../../Views/SyncWithExtensionSuccess';
import Main from '../Main';
import OptinMetrics from '../../UI/OptinMetrics';
import MetaMaskAnimation from '../../UI/MetaMaskAnimation';
import SimpleWebview from '../../Views/SimpleWebview';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import Engine from '../../../core/Engine';
import { BranchSubscriber } from 'react-native-branch';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { routingInstrumentation } from '../../../util/setupSentry';
import Analytics from '../../../core/Analytics';
import { connect, useSelector, useDispatch } from 'react-redux';
import { EXISTING_USER, CURRENT_APP_VERSION, LAST_APP_VERSION } from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';
import { checkedAuth } from '../../../actions/user';
import { setCurrentRoute } from '../../../actions/navigation';
import { findRouteNameFromNavigatorState } from '../../../util/general';

const styles = StyleSheet.create({
	fill: { flex: 1 },
});

const Stack = createStackNavigator();
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
		<Stack.Screen name="ChoosePassword" component={ChoosePassword} options={ChoosePassword.navigationOptions} />
		<Stack.Screen name="ExtensionSync" component={ExtensionSync} />
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
	<Stack.Navigator initialRouteName={'OnboardingNav'} mode="modal" screenOptions={{ headerShown: false }}>
		<Stack.Screen name="OnboardingNav" component={OnboardingNav} />
		<Stack.Screen name="SyncWithExtensionSuccess" component={SyncWithExtensionSuccess} />
		<Stack.Screen name="QRScanner" component={QRScanner} header={null} />
		<Stack.Screen name="Webview" header={null} component={SimpleWebviewScreen} />
	</Stack.Navigator>
);

const App = ({ userLoggedIn }) => {
	const unsubscribeFromBranch = useRef();

	const animation = useRef(null);
	const animationName = useRef(null);
	const opacity = useRef(new Animated.Value(1)).current;
	const navigator = useRef();

	const [route, setRoute] = useState();
	const [animationPlayed, setAnimationPlayed] = useState();

	const isAuthChecked = useSelector((state) => state.user.isAuthChecked);
	const dispatch = useDispatch();
	const triggerCheckedAuth = () => dispatch(checkedAuth('onboarding'));
	const triggerSetCurrentRoute = (route) => dispatch(setCurrentRoute(route));

	const handleDeeplink = useCallback(({ error, params, uri }) => {
		if (error) {
			trackErrorAsAnalytics(error, 'Branch:');
		}
		const deeplink = params?.['+non_branch_link'] || uri || null;
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
	}, []);

	const branchSubscriber = useMemo(
		() =>
			new BranchSubscriber({
				onOpenStart: (opts) => {
					handleDeeplink(opts);
				},
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	useEffect(() => {
		SharedDeeplinkManager.init({
			navigate: (routeName, opts) => {
				const params = { name: routeName, params: opts };
				navigator.current?.dispatch?.(CommonActions.navigate(params));
			},
		});

		unsubscribeFromBranch.current = branchSubscriber.subscribe();

		return () => unsubscribeFromBranch.current?.();
	}, [branchSubscriber]);

	useEffect(() => {
		const initAnalytics = async () => {
			await Analytics.init();
		};

		initAnalytics();
	}, []);

	useEffect(() => {
		async function checkExsiting() {
			const existingUser = await AsyncStorage.getItem(EXISTING_USER);
			const route = !existingUser ? 'OnboardingRootNav' : 'Login';
			setRoute(route);
			if (!existingUser) {
				triggerCheckedAuth();
			}
		}

		checkExsiting();
	});

	useEffect(() => {
		async function startApp() {
			const existingUser = await AsyncStorage.getItem(EXISTING_USER);
			try {
				const currentVersion = await getVersion();
				const savedVersion = await AsyncStorage.getItem(CURRENT_APP_VERSION);
				if (currentVersion !== savedVersion) {
					if (savedVersion) await AsyncStorage.setItem(LAST_APP_VERSION, savedVersion);
					await AsyncStorage.setItem(CURRENT_APP_VERSION, currentVersion);
				}

				const lastVersion = await AsyncStorage.getItem(LAST_APP_VERSION);
				if (!lastVersion) {
					if (existingUser) {
						// Setting last version to first version if user exists and lastVersion does not, to simulate update
						await AsyncStorage.setItem(LAST_APP_VERSION, '0.0.1');
					} else {
						// Setting last version to current version so that it's not treated as an update
						await AsyncStorage.setItem(LAST_APP_VERSION, currentVersion);
					}
				}
			} catch (error) {
				Logger.error(error);
			}
		}

		startApp();
	}, []);

	useEffect(() => {
		if (!isAuthChecked) {
			return;
		}
		const startAnimation = async () => {
			await new Promise((res) => setTimeout(res, 50));
			animation?.current?.play();
			animationName?.current?.play();
		};
		startAnimation();
	}, [isAuthChecked]);

	const onAnimationFinished = useCallback(() => {
		Animated.timing(opacity, {
			toValue: 0,
			duration: 300,
			useNativeDriver: true,
			isInteraction: false,
		}).start(() => {
			setAnimationPlayed(true);
		});
	}, [opacity]);

	const renderSplash = () => {
		if (!animationPlayed) {
			return (
				<MetaMaskAnimation
					animation={animation}
					animationName={animationName}
					opacity={opacity}
					onAnimationFinish={onAnimationFinished}
				/>
			);
		}
		return null;
	};

	return (
		// do not render unless a route is defined
		(route && (
			<View style={styles.fill}>
				<NavigationContainer
					ref={navigator}
					onReady={() => {
						routingInstrumentation.registerNavigationContainer(navigator);
					}}
					onStateChange={(state) => {
						// Updates redux with latest route. Used by DrawerView component.
						const currentRoute = findRouteNameFromNavigatorState(state.routes);
						triggerSetCurrentRoute(currentRoute);
					}}
				>
					<Stack.Navigator route={route} initialRouteName={route}>
						<Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
						<Stack.Screen
							name="OnboardingRootNav"
							component={OnboardingRootNav}
							options={{ headerShown: false }}
						/>
						{userLoggedIn && (
							<Stack.Screen name="HomeNav" component={Main} options={{ headerShown: false }} />
						)}
					</Stack.Navigator>
				</NavigationContainer>
				{renderSplash()}
			</View>
		)) ||
		null
	);
};

const mapStateToProps = (state) => ({
	userLoggedIn: state.user.userLoggedIn,
});

export default connect(mapStateToProps)(App);
