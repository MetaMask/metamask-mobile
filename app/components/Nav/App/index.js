import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { Animated, Linking } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../../Views/Login';
import QRScanner from '../../Views/QRScanner';
import Onboarding from '../../Views/Onboarding';
import OnboardingCarousel from '../../Views/OnboardingCarousel';
import ChoosePassword from '../../Views/ChoosePassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ImportFromSecretRecoveryPhrase from '../../Views/ImportFromSecretRecoveryPhrase';
import DeleteWalletModal from '../../../components/UI/DeleteWalletModal';
import WhatsNewModal from '../../UI/WhatsNewModal/WhatsNewModal';
import Main from '../Main';
import OptinMetrics from '../../UI/OptinMetrics';
import MetaMaskAnimation from '../../UI/MetaMaskAnimation';
import SimpleWebview from '../../Views/SimpleWebview';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import Engine from '../../../core/Engine';
import branch from 'react-native-branch';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
import { routingInstrumentation } from '../../../util/sentry/utils';
import { connect, useDispatch } from 'react-redux';
import {
  CURRENT_APP_VERSION,
  EXISTING_USER,
  LAST_APP_VERSION,
} from '../../../constants/storage';
import { getVersion } from 'react-native-device-info';
import {
  setCurrentBottomNavRoute,
  setCurrentRoute,
} from '../../../actions/navigation';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { Authentication } from '../../../core/';
import { isBlockaidFeatureEnabled } from '../../../util/blockaid';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import SDKConnect from '../../../core/SDKConnect/SDKConnect';
import { colors as importedColors } from '../../../styles/common';
import Routes from '../../../constants/navigation/Routes';
import ModalConfirmation from '../../../component-library/components/Modals/ModalConfirmation';
import Toast, {
  ToastContext,
} from '../../../component-library/components/Toast';
import AccountSelector from '../../../components/Views/AccountSelector';
import AccountConnect from '../../../components/Views/AccountConnect';
import AccountPermissions from '../../../components/Views/AccountPermissions';
import { SRPQuiz } from '../../Views/Quiz';
import { TurnOffRememberMeModal } from '../../../components/UI/TurnOffRememberMeModal';
import AssetHideConfirmation from '../../Views/AssetHideConfirmation';
import DetectedTokens from '../../Views/DetectedTokens';
import DetectedTokensConfirmation from '../../Views/DetectedTokensConfirmation';
import AssetOptions from '../../Views/AssetOptions';
import ImportPrivateKey from '../../Views/ImportPrivateKey';
import ImportPrivateKeySuccess from '../../Views/ImportPrivateKeySuccess';
import ConnectQRHardware from '../../Views/ConnectQRHardware';
import SelectHardwareWallet from '../../Views/ConnectHardware/SelectHardware';
import LedgerAccountInfo from '../../Views/LedgerAccountInfo';
import LedgerConnect from '../../Views/LedgerConnect';
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../constants/error';
import { UpdateNeeded } from '../../../components/UI/UpdateNeeded';
import { EnableAutomaticSecurityChecksModal } from '../../../components/UI/EnableAutomaticSecurityChecksModal';
import NetworkSettings from '../../Views/Settings/NetworksSettings/NetworkSettings';
import ModalMandatory from '../../../component-library/components/Modals/ModalMandatory';
import { RestoreWallet } from '../../Views/RestoreWallet';
import WalletRestored from '../../Views/RestoreWallet/WalletRestored';
import WalletResetNeeded from '../../Views/RestoreWallet/WalletResetNeeded';
import SDKLoadingModal from '../../Views/SDKLoadingModal/SDKLoadingModal';
import SDKFeedbackModal from '../../Views/SDKFeedbackModal/SDKFeedbackModal';
import LedgerMessageSignModal from '../../UI/LedgerModals/LedgerMessageSignModal';
import LedgerTransactionModal from '../../UI/LedgerModals/LedgerTransactionModal';
import AccountActions from '../../../components/Views/AccountActions';
import EthSignFriction from '../../../components/Views/Settings/AdvancedSettings/EthSignFriction';
import WalletActions from '../../Views/WalletActions';
import NetworkSelector from '../../../components/Views/NetworkSelector';
import ReturnToAppModal from '../../Views/ReturnToAppModal';
import EditAccountName from '../../Views/EditAccountName/EditAccountName';
import WC2Manager, {
  isWC2Enabled,
} from '../../../../app/core/WalletConnect/WalletConnectV2';
import { PPOMView } from '../../../lib/ppom/PPOMView';
import NavigationService from '../../../core/NavigationService';
import LockScreen from '../../Views/LockScreen';
import AsyncStorage from '../../../store/async-storage-wrapper';
import ShowIpfsGatewaySheet from '../../Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet';
import ShowDisplayNftMediaSheet from '../../Views/ShowDisplayMediaNFTSheet/ShowDisplayNFTMediaSheet';
import AmbiguousAddressSheet from '../../../../app/components/Views/Settings/Contacts/AmbiguousAddressSheet/AmbiguousAddressSheet';
import SDKDisconnectModal from '../../../../app/components/Views/SDKDisconnectModal/SDKDisconnectModal';
import SDKSessionModal from '../../../../app/components/Views/SDKSessionModal/SDKSessionModal';
import { MetaMetrics } from '../../../core/Analytics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import generateUserSettingsAnalyticsMetaData from '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';

const clearStackNavigatorOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
    cardStyleInterpolator: () => ({
      overlayStyle: {
        opacity: 0,
      },
    }),
  },
  animationEnabled: false,
};

const Stack = createStackNavigator();
/**
 * Stack navigator responsible for the onboarding process
 * Create Wallet and Import from Secret Recovery Phrase
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
      name={Routes.ONBOARDING.IMPORT_FROM_SECRET_RECOVERY_PHRASE}
      component={ImportFromSecretRecoveryPhrase}
      options={ImportFromSecretRecoveryPhrase.navigationOptions}
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
      name={Routes.WEBVIEW.SIMPLE}
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
      name={Routes.QR_SCANNER}
      component={QRScanner}
      header={null}
    />
    <Stack.Screen
      name={Routes.WEBVIEW.MAIN}
      header={null}
      component={SimpleWebviewScreen}
    />
  </Stack.Navigator>
);

const VaultRecoveryFlow = () => (
  <Stack.Navigator
    initialRouteName={Routes.VAULT_RECOVERY.RESTORE_WALLET}
    screenOptions={{ headerShown: false }}
  >
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
      component={RestoreWallet}
    />
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.WALLET_RESTORED}
      component={WalletRestored}
    />
    <Stack.Screen
      name={Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED}
      component={WalletResetNeeded}
    />
  </Stack.Navigator>
);

const App = ({ userLoggedIn }) => {
  const animationRef = useRef(null);
  const animationNameRef = useRef(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const [navigator, setNavigator] = useState(undefined);
  const prevNavigator = useRef(navigator);
  const [route, setRoute] = useState();
  const queueOfHandleDeeplinkFunctions = useRef([]);
  const [animationPlayed, setAnimationPlayed] = useState(false);
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const dispatch = useDispatch();
  const sdkInit = useRef();
  const [onboarded, setOnboarded] = useState(false);
  const triggerSetCurrentRoute = (route) => {
    dispatch(setCurrentRoute(route));
    if (route === 'Wallet' || route === 'BrowserView') {
      setOnboarded(true);
      dispatch(setCurrentBottomNavRoute(route));
    }
  };

  useEffect(() => {
    if (prevNavigator.current || !navigator) return;
    const appTriggeredAuth = async () => {
      const { PreferencesController } = Engine.context;
      const selectedAddress = PreferencesController.state.selectedAddress;
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      try {
        if (existingUser && selectedAddress) {
          await Authentication.appTriggeredAuth({ selectedAddress });
          // we need to reset the navigator here so that the user cannot go back to the login screen
          navigator.reset({ routes: [{ name: Routes.ONBOARDING.HOME_NAV }] });
        }
      } catch (error) {
        // if there are no credentials, then they were cleared in the last session and we should not show biometrics on the login screen
        if (
          error.message === AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS
        ) {
          navigator.dispatch(
            CommonActions.setParams({
              locked: true,
            }),
          );
        }
        await Authentication.lockApp(false);
        trackErrorAsAnalytics(
          'App: Max Attempts Reached',
          error?.message,
          `Unlock attempts: 1`,
        );
      } finally {
        animationRef?.current?.play();
        animationNameRef?.current?.play();
      }
    };
    appTriggeredAuth()
      .then(() => {
        queueOfHandleDeeplinkFunctions.current.forEach((func) => func());

        queueOfHandleDeeplinkFunctions.current = [];
      })
      .catch((error) => {
        Logger.error(error, 'App: Error in appTriggeredAuth');
      });
  }, [navigator, queueOfHandleDeeplinkFunctions]);

  const handleDeeplink = useCallback(({ error, params, uri }) => {
    if (error) {
      trackErrorAsAnalytics(error, 'Branch:');
    }
    const deeplink = params?.['+non_branch_link'] || uri || null;
    try {
      if (deeplink) {
        SharedDeeplinkManager.parse(deeplink, {
          origin: AppConstants.DEEPLINKS.ORIGIN_DEEPLINK,
        });
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
            // Log error for analytics and continue handling deeplink
            Logger.error('Error from Branch: ' + error);
          }

          if (sdkInit.current) {
            handleDeeplink(opts);
          } else {
            queueOfHandleDeeplinkFunctions.current =
              queueOfHandleDeeplinkFunctions.current.concat(() => {
                handleDeeplink(opts);
              });
          }
        });
      }
      prevNavigator.current = navigator;
    }
  }, [dispatch, handleDeeplink, navigator, queueOfHandleDeeplinkFunctions]);

  useEffect(() => {
    const initMetrics = async () => {
      const metrics = MetaMetrics.getInstance();
      await metrics.configure();
      // identify user with the latest traits
      // run only after the MetaMetrics is configured
      const consolidatedTraits = {
        ...generateDeviceAnalyticsMetaData(),
        ...generateUserSettingsAnalyticsMetaData(),
      };
      await metrics.addTraitsToUser(consolidatedTraits);
    };

    initMetrics().catch((err) => {
      Logger.error(err, 'Error initializing MetaMetrics');
    });
  }, []);

  useEffect(() => {
    // Init SDKConnect only if the navigator is ready, user is onboarded, and SDK is not initialized.
    async function initSDKConnect() {
      if (
        navigator?.getCurrentRoute &&
        onboarded &&
        sdkInit.current === undefined &&
        userLoggedIn
      ) {
        sdkInit.current = false;
        try {
          const sdkConnect = SDKConnect.getInstance();
          await sdkConnect.init({ navigation: navigator, context: 'Nav/App' });
          await SDKConnect.getInstance().postInit();
          sdkInit.current = true;
        } catch (err) {
          sdkInit.current = undefined;
          console.error(`Cannot initialize SDKConnect`, err);
        }
      }
    }
    initSDKConnect().catch((err) => {
      Logger.error(err, 'Error initializing SDKConnect');
    });
  }, [navigator, onboarded, userLoggedIn]);

  useEffect(() => {
    if (isWC2Enabled) {
      WC2Manager.init().catch((err) => {
        console.error('Cannot initialize WalletConnect Manager.', err);
      });
    }
  }, []);

  useEffect(() => {
    async function checkExisting() {
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      setOnboarded(!!existingUser);
      const route = !existingUser
        ? Routes.ONBOARDING.ROOT_NAV
        : Routes.ONBOARDING.LOGIN;
      setRoute(route);
    }

    checkExisting().catch((error) => {
      Logger.error(error, 'Error checking existing user');
    });
    /* eslint-disable react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    async function startApp() {
      const existingUser = await AsyncStorage.getItem(EXISTING_USER);
      try {
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
    }

    startApp().catch((error) => {
      Logger.error(error, 'Error starting app');
    });
  }, []);

  const setNavigatorRef = (ref) => {
    if (!prevNavigator.current) {
      setNavigator(ref);
      NavigationService.setNavigationRef(ref);
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
          animationRef={animationRef}
          animationName={animationNameRef}
          opacity={opacity}
          onAnimationFinish={onAnimationFinished}
        />
      );
    }
    return null;
  };

  const DetectedTokensFlow = () => (
    <Stack.Navigator
      mode={'modal'}
      screenOptions={clearStackNavigatorOptions}
      initialRouteName={'DetectedTokens'}
    >
      <Stack.Screen name={'DetectedTokens'} component={DetectedTokens} />
      <Stack.Screen
        name={'DetectedTokensConfirmation'}
        component={DetectedTokensConfirmation}
      />
    </Stack.Navigator>
  );

  const RootModalFlow = () => (
    <Stack.Navigator mode={'modal'} screenOptions={clearStackNavigatorOptions}>
      <Stack.Screen
        name={Routes.MODAL.WALLET_ACTIONS}
        component={WalletActions}
      />
      <Stack.Screen
        name={Routes.MODAL.DELETE_WALLET}
        component={DeleteWalletModal}
      />
      <Stack.Screen
        name={Routes.MODAL.MODAL_CONFIRMATION}
        component={ModalConfirmation}
      />
      <Stack.Screen
        name={Routes.MODAL.MODAL_MANDATORY}
        component={ModalMandatory}
      />
      <Stack.Screen name={Routes.MODAL.WHATS_NEW} component={WhatsNewModal} />
      <Stack.Screen
        name={Routes.SHEET.ACCOUNT_SELECTOR}
        component={AccountSelector}
      />
      <Stack.Screen
        name={Routes.SHEET.SDK_LOADING}
        component={SDKLoadingModal}
      />
      <Stack.Screen
        name={Routes.SHEET.SDK_FEEDBACK}
        component={SDKFeedbackModal}
      />
      <Stack.Screen
        name={Routes.SHEET.SDK_MANAGE_CONNECTIONS}
        component={SDKSessionModal}
      />
      <Stack.Screen
        name={Routes.SHEET.SDK_DISCONNECT}
        component={SDKDisconnectModal}
      />
      <Stack.Screen
        name={Routes.SHEET.ACCOUNT_CONNECT}
        component={AccountConnect}
      />
      <Stack.Screen
        name={Routes.SHEET.ACCOUNT_PERMISSIONS}
        component={AccountPermissions}
      />
      <Stack.Screen
        name={Routes.SHEET.NETWORK_SELECTOR}
        component={NetworkSelector}
      />
      <Stack.Screen
        name={Routes.SHEET.RETURN_TO_DAPP_MODAL}
        component={ReturnToAppModal}
      />
      <Stack.Screen
        name={Routes.SHEET.AMBIGUOUS_ADDRESS}
        component={AmbiguousAddressSheet}
      />
      <Stack.Screen
        name={Routes.MODAL.TURN_OFF_REMEMBER_ME}
        component={TurnOffRememberMeModal}
      />
      <Stack.Screen
        name={'AssetHideConfirmation'}
        component={AssetHideConfirmation}
      />
      <Stack.Screen name={'DetectedTokens'} component={DetectedTokensFlow} />
      <Stack.Screen name={'AssetOptions'} component={AssetOptions} />
      <Stack.Screen
        name={Routes.MODAL.UPDATE_NEEDED}
        component={UpdateNeeded}
      />
      <Stack.Screen
        name={Routes.MODAL.ENABLE_AUTOMATIC_SECURITY_CHECKS}
        component={EnableAutomaticSecurityChecksModal}
      />
      <Stack.Screen name={Routes.MODAL.SRP_REVEAL_QUIZ} component={SRPQuiz} />
      <Stack.Screen
        name={Routes.SHEET.ACCOUNT_ACTIONS}
        component={AccountActions}
      />
      <Stack.Screen
        name={Routes.SHEET.ETH_SIGN_FRICTION}
        component={EthSignFriction}
      />
      <Stack.Screen
        name={Routes.SHEET.SHOW_IPFS}
        component={ShowIpfsGatewaySheet}
      />
      <Stack.Screen
        name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}
        component={ShowDisplayNftMediaSheet}
      />
    </Stack.Navigator>
  );

  const ImportPrivateKeyView = () => (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ImportPrivateKey" component={ImportPrivateKey} />
      <Stack.Screen
        name="ImportPrivateKeySuccess"
        component={ImportPrivateKeySuccess}
      />
      <Stack.Screen
        name={Routes.QR_SCANNER}
        component={QRScanner}
        screenOptions={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );

  const ConnectQRHardwareFlow = () => (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ConnectQRHardware" component={ConnectQRHardware} />
    </Stack.Navigator>
  );

  const LedgerConnectFlow = () => (
    <Stack.Navigator initialRouteName={Routes.HW.LEDGER_CONNECT}>
      <Stack.Screen name={Routes.HW.LEDGER_CONNECT} component={LedgerConnect} />
    </Stack.Navigator>
  );

  const ConnectHardwareWalletFlow = () => (
    <Stack.Navigator name="ConnectHardwareWallet">
      <Stack.Screen
        name={Routes.HW.SELECT_DEVICE}
        component={SelectHardwareWallet}
        options={SelectHardwareWallet.navigationOptions}
      />
      <Stack.Screen name="LedgerAccountInfo" component={LedgerAccountInfo} />
    </Stack.Navigator>
  );

  const EditAccountNameFlow = () => (
    <Stack.Navigator>
      <Stack.Screen name="EditAccountName" component={EditAccountName} />
    </Stack.Navigator>
  );

  // eslint-disable-next-line react/prop-types
  const AddNetworkFlow = ({ route }) => (
    <Stack.Navigator>
      <Stack.Screen
        name="AddNetwork"
        component={NetworkSettings}
        // eslint-disable-next-line react/prop-types
        initialParams={route?.params}
      />
    </Stack.Navigator>
  );

  return (
    // do not render unless a route is defined
    (route && (
      <>
        {isBlockaidFeatureEnabled() && <PPOMView />}
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
              name={Routes.ONBOARDING.LOGIN}
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
                name={Routes.ONBOARDING.HOME_NAV}
                component={Main}
                options={{ headerShown: false }}
              />
            )}
            <Stack.Screen
              name={Routes.VAULT_RECOVERY.RESTORE_WALLET}
              component={VaultRecoveryFlow}
            />
            <Stack.Screen
              name={Routes.MODAL.ROOT_MODAL_FLOW}
              component={RootModalFlow}
            />
            <Stack.Screen
              name="ImportPrivateKeyView"
              component={ImportPrivateKeyView}
              options={{ animationEnabled: true }}
            />
            <Stack.Screen
              name="ConnectQRHardwareFlow"
              component={ConnectQRHardwareFlow}
              options={{ animationEnabled: true }}
            />
            <Stack.Screen
              name={Routes.HW.CONNECT_LEDGER}
              component={LedgerConnectFlow}
            />
            <Stack.Screen
              name={Routes.HW.CONNECT}
              component={ConnectHardwareWalletFlow}
            />
            <Stack.Screen
              options={{
                //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
                cardStyle: { backgroundColor: importedColors.transparent },
                cardStyleInterpolator: () => ({
                  overlayStyle: {
                    opacity: 0,
                  },
                }),
              }}
              name={Routes.LEDGER_TRANSACTION_MODAL}
              component={LedgerTransactionModal}
            />
            <Stack.Screen
              options={{
                //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
                cardStyle: { backgroundColor: importedColors.transparent },
                cardStyleInterpolator: () => ({
                  overlayStyle: {
                    opacity: 0,
                  },
                }),
              }}
              name={Routes.LEDGER_MESSAGE_SIGN_MODAL}
              component={LedgerMessageSignModal}
            />
            <Stack.Screen
              name="EditAccountName"
              component={EditAccountNameFlow}
              options={{ animationEnabled: true }}
            />
            <Stack.Screen
              name={Routes.ADD_NETWORK}
              component={AddNetworkFlow}
              options={{ animationEnabled: true }}
            />
            <Stack.Screen
              name={Routes.LOCK_SCREEN}
              component={LockScreen}
              options={{ gestureEnabled: false }}
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
});

export default connect(mapStateToProps)(App);
