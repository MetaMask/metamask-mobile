import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { Animated, Linking } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import DeleteWalletModal from '../../../components/UI/DeleteWalletModal';
import WhatsNewModal from '../../UI/WhatsNewModal/WhatsNewModal';
import Main from '../Main';
import OptinMetrics from '../../UI/OptinMetrics';
import MetaMaskAnimation from '../../UI/MetaMaskAnimation';
import SimpleWebview from '../../Views/SimpleWebview';
import SharedDeeplinkManager from '../../../core/DeeplinkManager';
import Engine from '../../../core/Engine';
import branch from 'react-native-branch';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { routingInstrumentation } from '../../../util/sentryUtils';
import Analytics from '../../../core/Analytics/Analytics';
import { connect, useSelector, useDispatch } from 'react-redux';
import {
  EXISTING_USER,
  CURRENT_APP_VERSION,
  LAST_APP_VERSION,
} from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';
import { setCurrentRoute } from '../../../actions/navigation';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { Authentication } from '../../../core/';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import SDKConnect from '../../../core/SDKConnect';
import { colors as importedColors } from '../../../styles/common';
import Routes from '../../../constants/navigation/Routes';
import ModalConfirmation from '../../../component-library/components/Modals/ModalConfirmation';
import Toast, {
  ToastContext,
} from '../../../component-library/components/Toast';
import { TurnOffRememberMeModal } from '../../../components/UI/TurnOffRememberMeModal';

const Stack = createStackNavigator();
/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet, Import from Seed and Sync
 */
const OnboardingNav = () => (
  <Stack.Navigator initialRouteName="OnboardingCarousel">
    <Stack.Screen
      name="Onboarding"
      component={Onboarding}
      options={Onboarding.navigationOptions}
    />
    <Stack.Screen
      name="OnboardingCarousel"
      component={OnboardingCarousel}
      options={OnboardingCarousel.navigationOptions}
    />
    <Stack.Screen
      name="ChoosePassword"
      component={ChoosePassword}
      options={ChoosePassword.navigationOptions}
    />
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
    <Stack.Screen
      name="ImportFromSeed"
      component={ImportFromSeed}
      options={ImportFromSeed.navigationOptions}
    />
    <Stack.Screen
      name="OptinMetrics"
      component={OptinMetrics}
      options={OptinMetrics.navigationOptions}
    />
  </Stack.Navigator>
);

/**
 * Parent Stack navigator that allows the
 * child OnboardingNav navigator to push modals on top of it
 */
const SimpleWebviewScreen = () => (
  <Stack.Navigator mode={'modal'}>
    <Stack.Screen
      name="SimpleWebview"
      component={SimpleWebview}
      options={SimpleWebview.navigationOptions}
    />
  </Stack.Navigator>
);

const OnboardingRootNav = () => (
  <Stack.Navigator
    initialRouteName={Routes.ONBOARDING.NAV}
    mode="modal"
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen name="OnboardingNav" component={OnboardingNav} />
    <Stack.Screen
      name="SyncWithExtensionSuccess"
      component={SyncWithExtensionSuccess}
    />
    <Stack.Screen name="QRScanner" component={QRScanner} header={null} />
    <Stack.Screen
      name="Webview"
      header={null}
      component={SimpleWebviewScreen}
    />
  </Stack.Navigator>
);

const App = ({ selectedAddress, userLoggedIn }) => {
  const animation = useRef(null);
  const animationName = useRef(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const authOnLoadAuthLock = useRef(false);
  const [navigator, setNavigator] = useState(undefined);
  const prevNavigator = useRef(navigator);
  const [route, setRoute] = useState();
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const dispatch = useDispatch();
  const triggerSetCurrentRoute = (route) => dispatch(setCurrentRoute(route));
  const frequentRpcList = useSelector(
    (state) =>
      state?.engine?.backgroundState?.PreferencesController?.frequentRpcList,
  );

  useEffect(() => {
    console.log('Auth/App userLoggedIn', userLoggedIn);
  }, [userLoggedIn]);

  useEffect(() => {
    const appTriggeredAuth = async () => {
      console.log('Auth/App appTriggeredAuth');
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      console.log('Auth/appTriggeredAuth existingUser', existingUser);
      try {
        if (existingUser && !authOnLoadAuthLock.current && selectedAddress) {
          await Authentication.appTriggeredAuth(selectedAddress);
        }

        //Cancel auth if the existing user has not been set
      } catch (error) {
        console.log('Auth/App appTriggeredAuth error  calling logout', error);
        await Authentication.logout(false);
        trackErrorAsAnalytics(
          'App: Max Attempts Reached',
          error?.message,
          `Unlock attempts: 1`,
        );
      } finally {
        authOnLoadAuthLock.current = true;
      }
    };
    appTriggeredAuth();
  }, [authOnLoadAuthLock, selectedAddress]);

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
          ? SharedDeeplinkManager.parse(deeplink, {
              origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
            })
          : SharedDeeplinkManager.setDeeplink(deeplink);
      }
    } catch (e) {
      Logger.error(e, `Deeplink: Error parsing deeplink`);
    }
  }, []);

  // on Android devices, this creates a listener
  // to deeplinks used to open the app
  // when it is in background (so not closed)
  // Documentation: https://reactnative.dev/docs/linking#handling-deep-links
  useEffect(() => {
    if (Device.isAndroid())
      Linking.addEventListener('url', (params) => {
        const { url } = params;
        if (url) {
          handleDeeplink({ uri: url });
        }
      });
  }, [handleDeeplink]);

  useEffect(() => {
    if (navigator) {
      // Initialize deep link manager
      SharedDeeplinkManager.init({
        navigation: {
          navigate: (routeName, opts) => {
            const params = { name: routeName, params: opts };
            navigator.dispatch?.(CommonActions.navigate(params));
          },
        },
        frequentRpcList,
        dispatch,
      });
      if (!prevNavigator.current) {
        // Setup navigator with Sentry instrumentation
        routingInstrumentation.registerNavigationContainer(navigator);
        // Subscribe to incoming deeplinks
        // Branch.io documentation: https://help.branch.io/developers-hub/docs/react-native
        branch.subscribe((opts) => {
          const { error } = opts;

          if (error) {
            Logger.error('Error from Branch: ' + error);
            return;
          }

          handleDeeplink(opts);
        });
      }
      prevNavigator.current = navigator;
    }
  }, [dispatch, handleDeeplink, frequentRpcList, navigator]);

  useEffect(() => {
    const initAnalytics = async () => {
      await Analytics.init();
    };

    initAnalytics();
  }, []);

  useEffect(() => {
    SDKConnect.init();
  }, []);

  useEffect(() => {
    async function checkExisting() {
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      console.log('Auth/App checkExisting existingUser', existingUser);
      const route = !existingUser
        ? Routes.ONBOARDING.ROOT_NAV
        : Routes.ONBOARDING.LOGIN;
      console.log('Auth/checkExisting route', route);
      setRoute(route);
    }
    checkExisting();
  }, [userLoggedIn]);

  useEffect(() => {
    async function startApp() {
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      try {
        console.log('Auth/startApp');
        const currentVersion = getVersion();
        const savedVersion = await AsyncStorage.getItem(CURRENT_APP_VERSION);
        if (currentVersion !== savedVersion) {
          if (savedVersion)
            await AsyncStorage.setItem(LAST_APP_VERSION, savedVersion);
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

      animation?.current?.play();
      animationName?.current?.play();
    }

    startApp();
  }, []);

  const setNavigatorRef = (ref) => {
    if (!prevNavigator.current) {
      setNavigator(ref);
    }
  };

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

  const RootModalFlow = () => (
    <Stack.Navigator
      mode={'modal'}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: importedColors.transparent },
        animationEnabled: false,
      }}
    >
      <Stack.Screen
        name={Routes.MODAL.DELETE_WALLET}
        component={DeleteWalletModal}
      />
      <Stack.Screen
        name={Routes.MODAL.MODAL_CONFIRMATION}
        component={ModalConfirmation}
      />
      <Stack.Screen name={Routes.MODAL.WHATS_NEW} component={WhatsNewModal} />
      <Stack.Screen
        name={Routes.MODAL.TURN_OFF_REMEMBER_ME}
        component={TurnOffRememberMeModal}
      />
    </Stack.Navigator>
  );

  return (
    // do not render unless a route is defined
    (route && (
      <>
        <NavigationContainer
          // Prevents artifacts when navigating between screens
          theme={{
            colors: {
              background: colors.background.default,
            },
          }}
          ref={setNavigatorRef}
          onStateChange={(state) => {
            // Updates redux with latest route. Used by DrawerView component.
            const currentRoute = findRouteNameFromNavigatorState(state.routes);
            triggerSetCurrentRoute(currentRoute);
          }}
        >
          <Stack.Navigator
            initialRouteName={route}
            mode={'modal'}
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: importedColors.transparent },
              animationEnabled: false,
            }}
          >
            <Stack.Screen
              name="Login"
              component={Login}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingRootNav"
              component={OnboardingRootNav}
              options={{ headerShown: false }}
            />
            {userLoggedIn && (
              <Stack.Screen
                name="HomeNav"
                component={Main}
                options={{ headerShown: false }}
              />
            )}
            <Stack.Screen
              name={Routes.MODAL.ROOT_MODAL_FLOW}
              component={RootModalFlow}
            />
          </Stack.Navigator>
        </NavigationContainer>
        {renderSplash()}
        <Toast ref={toastRef} />
      </>
    )) ||
    null
  );
};

const mapStateToProps = (state) => ({
  userLoggedIn: state.user.userLoggedIn,
  selectedAddress:
    state.engine.backgroundState?.PreferencesController?.selectedAddress,
});

export default connect(mapStateToProps)(App);
