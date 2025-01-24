import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import PropTypes from 'prop-types';
import {
  Linking,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  View,
  ///: END:ONLY_INCLUDE_IF
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from '../../Views/Login';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import DataCollectionModal from '../../Views/DataCollectionModal';
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
import Main from '../Main';
import OptinMetrics from '../../UI/OptinMetrics';
import SimpleWebview from '../../Views/SimpleWebview';
import SharedDeeplinkManager from '../../../core/DeeplinkManager/SharedDeeplinkManager';
import branch from 'react-native-branch';
import AppConstants from '../../../core/AppConstants';
import Logger from '../../../util/Logger';
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
  onNavigationReady,
} from '../../../actions/navigation';
import { findRouteNameFromNavigatorState } from '../../../util/general';
import { Authentication } from '../../../core/';
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
import { TokenSortBottomSheet } from '../../../components/UI/Tokens/TokensBottomSheet/TokenSortBottomSheet.tsx';
import { TokenFilterBottomSheet } from '../../../components/UI/Tokens/TokensBottomSheet/TokenFilterBottomSheet.tsx';
import AccountConnect from '../../../components/Views/AccountConnect';
import AccountPermissions from '../../../components/Views/AccountPermissions';
import { AccountPermissionsScreens } from '../../../components/Views/AccountPermissions/AccountPermissions.types';
import AccountPermissionsConfirmRevokeAll from '../../../components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll';
import ConnectionDetails from '../../../components/Views/AccountPermissions/ConnectionDetails';
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
import { AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS } from '../../../constants/error';
import { UpdateNeeded } from '../../../components/UI/UpdateNeeded';
import { EnableAutomaticSecurityChecksModal } from '../../../components/UI/EnableAutomaticSecurityChecksModal';
import NetworkSettings from '../../Views/Settings/NetworksSettings/NetworkSettings';
import ModalMandatory from '../../../component-library/components/Modals/ModalMandatory';
import { RestoreWallet } from '../../Views/RestoreWallet';
import WalletRestored from '../../Views/RestoreWallet/WalletRestored';
import WalletResetNeeded from '../../Views/RestoreWallet/WalletResetNeeded';
import SDKLoadingModal from '../../Views/SDK/SDKLoadingModal/SDKLoadingModal';
import SDKFeedbackModal from '../../Views/SDK/SDKFeedbackModal/SDKFeedbackModal';
import LedgerMessageSignModal from '../../UI/LedgerModals/LedgerMessageSignModal';
import LedgerTransactionModal from '../../UI/LedgerModals/LedgerTransactionModal';
import AccountActions from '../../../components/Views/AccountActions';
import FiatOnTestnetsFriction from '../../../components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction';
import WalletActions from '../../Views/WalletActions';
import NetworkSelector from '../../../components/Views/NetworkSelector';
import ReturnToAppModal from '../../Views/ReturnToAppModal';
import EditAccountName from '../../Views/EditAccountName/EditAccountName';
import WC2Manager, {
  isWC2Enabled,
} from '../../../../app/core/WalletConnect/WalletConnectV2';
import { DevLogger } from '../../../../app/core/SDKConnect/utils/DevLogger';
import { PPOMView } from '../../../lib/ppom/PPOMView';
import NavigationService from '../../../core/NavigationService';
import LockScreen from '../../Views/LockScreen';
import StorageWrapper from '../../../store/storage-wrapper';
import ShowIpfsGatewaySheet from '../../Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet';
import ShowDisplayNftMediaSheet from '../../Views/ShowDisplayMediaNFTSheet/ShowDisplayNFTMediaSheet';
import AmbiguousAddressSheet from '../../../../app/components/Views/Settings/Contacts/AmbiguousAddressSheet/AmbiguousAddressSheet';
import SDKDisconnectModal from '../../Views/SDK/SDKDisconnectModal/SDKDisconnectModal';
import SDKSessionModal from '../../Views/SDK/SDKSessionModal/SDKSessionModal';
import ExperienceEnhancerModal from '../../../../app/components/Views/ExperienceEnhancerModal';
import { MetaMetrics } from '../../../core/Analytics';
import trackErrorAsAnalytics from '../../../util/metrics/TrackError/trackErrorAsAnalytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import generateUserSettingsAnalyticsMetaData from '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import LedgerSelectAccount from '../../Views/LedgerSelectAccount';
import OnboardingSuccess from '../../Views/OnboardingSuccess';
import DefaultSettings from '../../Views/OnboardingSuccess/DefaultSettings';
import OnboardingGeneralSettings from '../../Views/OnboardingSuccess/OnboardingGeneralSettings';
import OnboardingAssetsSettings from '../../Views/OnboardingSuccess/OnboardingAssetsSettings';
import OnboardingSecuritySettings from '../../Views/OnboardingSuccess/OnboardingSecuritySettings';
import BasicFunctionalityModal from '../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal';
import ProfileSyncingModal from '../../UI/ProfileSyncing/ProfileSyncingModal/ProfileSyncingModal';
import PermittedNetworksInfoSheet from '../../Views/AccountPermissions/PermittedNetworksInfoSheet/PermittedNetworksInfoSheet';
import ResetNotificationsModal from '../../UI/Notification/ResetNotificationsModal';
import NFTAutoDetectionModal from '../../../../app/components/Views/NFTAutoDetectionModal/NFTAutoDetectionModal';
import NftOptions from '../../../components/Views/NftOptions';
import ShowTokenIdSheet from '../../../components/Views/ShowTokenIdSheet';
import OriginSpamModal from '../../Views/OriginSpamModal/OriginSpamModal';
import { isNetworkUiRedesignEnabled } from '../../../util/networks/isNetworkUiRedesignEnabled';
import ChangeInSimulationModal from '../../Views/ChangeInSimulationModal/ChangeInSimulationModal';
import TooltipModal from '../../../components/Views/TooltipModal';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapsExecutionWebView } from '../../../lib/snaps';
///: END:ONLY_INCLUDE_IF
import OptionsSheet from '../../UI/SelectOptionSheet/OptionsSheet';
import FoxLoader from '../../../components/UI/FoxLoader';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';
import MultiRpcModal from '../../../components/Views/MultiRpcModal/MultiRpcModal';
import Engine from '../../../core/Engine';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
import { RpcEndpointType } from '@metamask/network-controller';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import getUIStartupSpan from '../../../core/Performance/UIStartup';

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

const OnboardingSuccessComponent = () => (
  <OnboardingSuccess
    onDone={() =>
      NavigationService.navigation.reset({ routes: [{ name: 'HomeNav' }] })
    }
  />
);

const OnboardingSuccessComponentNoSRP = () => (
  <OnboardingSuccess
    noSRP
    onDone={() =>
      NavigationService.navigation.reset({
        routes: [{ name: 'HomeNav' }],
      })
    }
  />
);

const OnboardingSuccessFlow = () => (
  <Stack.Navigator
    name={Routes.ONBOARDING.SUCCESS_FLOW}
    initialRouteName={Routes.ONBOARDING.SUCCESS}
  >
    <Stack.Screen
      name={Routes.ONBOARDING.SUCCESS}
      component={OnboardingSuccessComponent} // Used in SRP flow
      options={OnboardingSuccess.navigationOptions}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.DEFAULT_SETTINGS} // This is being used in import wallet flow
      component={DefaultSettings}
      options={DefaultSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.GENERAL_SETTINGS}
      component={OnboardingGeneralSettings}
      options={DefaultSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.ASSETS_SETTINGS}
      component={OnboardingAssetsSettings}
      options={DefaultSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.SECURITY_SETTINGS}
      component={OnboardingSecuritySettings}
      options={DefaultSettings.navigationOptions}
    />
  </Stack.Navigator>
);
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
      name={Routes.ONBOARDING.SUCCESS_FLOW}
      component={OnboardingSuccessFlow}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.SUCCESS}
      component={OnboardingSuccessComponentNoSRP} // Used in SRP flow
      options={OnboardingSuccess.navigationOptions}
    />
    <Stack.Screen
      name={Routes.ONBOARDING.DEFAULT_SETTINGS} // This is being used in import wallet flow
      component={DefaultSettings}
      options={DefaultSettings.navigationOptions}
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
      name={Routes.QR_TAB_SWITCHER}
      component={QRTabSwitcher}
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
    <Stack.Screen
      name={Routes.SHEET.ACCOUNT_SELECTOR}
      component={AccountSelector}
    />
    <Stack.Screen name={Routes.SHEET.SDK_LOADING} component={SDKLoadingModal} />
    <Stack.Screen
      name={Routes.SHEET.SDK_FEEDBACK}
      component={SDKFeedbackModal}
    />
    <Stack.Screen
      name={Routes.SHEET.SDK_MANAGE_CONNECTIONS}
      component={SDKSessionModal}
    />
    <Stack.Screen
      name={Routes.SHEET.EXPERIENCE_ENHANCER}
      component={ExperienceEnhancerModal}
    />
    <Stack.Screen
      name={Routes.SHEET.DATA_COLLECTION}
      component={DataCollectionModal}
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
      initialParams={{ initialScreen: AccountPermissionsScreens.Connected }}
    />
    <Stack.Screen
      name={Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS}
      component={AccountPermissionsConfirmRevokeAll}
    />
    <Stack.Screen
      name={Routes.SHEET.CONNECTION_DETAILS}
      component={ConnectionDetails}
    />
    <Stack.Screen
      name={Routes.SHEET.PERMITTED_NETWORKS_INFO_SHEET}
      component={PermittedNetworksInfoSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.NETWORK_SELECTOR}
      component={NetworkSelector}
    />
    <Stack.Screen
      name={Routes.SHEET.TOKEN_SORT}
      component={TokenSortBottomSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.TOKEN_FILTER}
      component={TokenFilterBottomSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.BASIC_FUNCTIONALITY}
      component={BasicFunctionalityModal}
    />
    <Stack.Screen
      name={Routes.SHEET.PROFILE_SYNCING}
      component={ProfileSyncingModal}
    />
    <Stack.Screen
      name={Routes.SHEET.RESET_NOTIFICATIONS}
      component={ResetNotificationsModal}
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
    <Stack.Screen name={'NftOptions'} component={NftOptions} />
    <Stack.Screen name={Routes.MODAL.UPDATE_NEEDED} component={UpdateNeeded} />
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
      name={Routes.SHEET.FIAT_ON_TESTNETS_FRICTION}
      component={FiatOnTestnetsFriction}
    />
    <Stack.Screen
      name={Routes.SHEET.SHOW_IPFS}
      component={ShowIpfsGatewaySheet}
    />
    <Stack.Screen
      name={Routes.SHEET.SHOW_NFT_DISPLAY_MEDIA}
      component={ShowDisplayNftMediaSheet}
    />
    <Stack.Screen
      name={Routes.MODAL.NFT_AUTO_DETECTION_MODAL}
      component={NFTAutoDetectionModal}
    />
    {isNetworkUiRedesignEnabled() ? (
      <Stack.Screen
        name={Routes.MODAL.MULTI_RPC_MIGRATION_MODAL}
        component={MultiRpcModal}
      />
    ) : null}
    <Stack.Screen
      name={Routes.SHEET.SHOW_TOKEN_ID}
      component={ShowTokenIdSheet}
    />
    <Stack.Screen
      name={Routes.SHEET.ORIGIN_SPAM_MODAL}
      component={OriginSpamModal}
    />
    <Stack.Screen
      name={Routes.SHEET.CHANGE_IN_SIMULATION_MODAL}
      component={ChangeInSimulationModal}
    />
    <Stack.Screen name={Routes.SHEET.TOOLTIP_MODAL} component={TooltipModal} />
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
      name={Routes.QR_TAB_SWITCHER}
      component={QRTabSwitcher}
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
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
    initialRouteName={Routes.HW.LEDGER_CONNECT}
  >
    <Stack.Screen
      name={Routes.HW.LEDGER_CONNECT}
      component={LedgerSelectAccount}
    />
  </Stack.Navigator>
);

const ConnectHardwareWalletFlow = () => (
  <Stack.Navigator name="ConnectHardwareWallet">
    <Stack.Screen
      name={Routes.HW.SELECT_DEVICE}
      component={SelectHardwareWallet}
      options={SelectHardwareWallet.navigationOptions}
    />
  </Stack.Navigator>
);

const App = (props) => {
  const { userLoggedIn } = props;
  // FIXME: Remove this when the unit tests are resolved for rendering this component. This property is only used by unit tests at the moment. Tests break when this is removed.
  const supressRender = props?.route?.params?.supressRender;
  const [navigator, setNavigator] = useState(undefined);
  const prevNavigator = useRef(navigator);
  const queueOfHandleDeeplinkFunctions = useRef([]);
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const dispatch = useDispatch();
  const sdkInit = useRef();
  const [onboarded, setOnboarded] = useState(false);

  const isFirstRender = useRef(true);

  if (isFirstRender.current) {
    trace({
      name: TraceName.NavInit,
      parentContext: getUIStartupSpan(),
      op: TraceOperation.NavInit,
    });

    isFirstRender.current = false;
  }

  const triggerSetCurrentRoute = (route) => {
    dispatch(setCurrentRoute(route));
    if (route === 'Wallet' || route === 'BrowserView') {
      setOnboarded(true);
      dispatch(setCurrentBottomNavRoute(route));
    }
  };

  useEffect(() => {
    if (prevNavigator.current || !navigator) return;

    endTrace({ name: TraceName.NavInit });
    endTrace({ name: TraceName.UIStartup });
  }, [navigator]);

  useEffect(() => {
    if (prevNavigator.current || !navigator) return;
    const appTriggeredAuth = async () => {
      const existingUser = await StorageWrapper.getItem(EXISTING_USER);
      setOnboarded(!!existingUser);
      try {
        if (existingUser) {
          // This should only be called if the auth type is not password, which is not the case so consider removing it
          await trace(
            {
              name: TraceName.AppStartBiometricAuthentication,
              op: TraceOperation.BiometricAuthentication,
            },
            async () => {
              await Authentication.appTriggeredAuth();
            },
          );
          // we need to reset the navigator here so that the user cannot go back to the login screen
          navigator.reset({ routes: [{ name: Routes.ONBOARDING.HOME_NAV }] });
        } else {
          navigator.reset({ routes: [{ name: Routes.ONBOARDING.ROOT_NAV }] });
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

        await Authentication.lockApp({ reset: false });
        trackErrorAsAnalytics(
          'App: Max Attempts Reached',
          error?.message,
          `Unlock attempts: 1`,
        );
      }
    };
    appTriggeredAuth().catch((error) => {
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
        AppStateEventProcessor.setCurrentDeeplink(deeplink);
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
            if (navigator) {
              const params = { name: routeName, params: opts };
              navigator.dispatch?.(CommonActions.navigate(params));
            }
          },
        },
        dispatch,
      });

      if (!prevNavigator.current) {
        // Subscribe to incoming deeplinks
        // Branch.io documentation: https://help.branch.io/developers-hub/docs/react-native
        branch.subscribe((opts) => {
          const { error } = opts;

          if (error) {
            // Log error for analytics and continue handling deeplink
            const branchError = new Error(error);
            Logger.error(branchError, 'Error subscribing to branch.');
          }

          if (sdkInit.current) {
            handleDeeplink(opts);
          } else {
            queueOfHandleDeeplinkFunctions.current =
              queueOfHandleDeeplinkFunctions.current.concat([
                () => {
                  handleDeeplink(opts);
                },
              ]);
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
          await SDKConnect.getInstance().postInit(() => {
            setTimeout(() => {
              queueOfHandleDeeplinkFunctions.current = [];
            }, 1000);
          });
          sdkInit.current = true;
        } catch (err) {
          sdkInit.current = undefined;
          console.error(`Cannot initialize SDKConnect`, err);
        }
      }
    }

    initSDKConnect()
      .then(() => {
        queueOfHandleDeeplinkFunctions.current.forEach((func) => func());
      })
      .catch((err) => {
        Logger.error(err, 'Error initializing SDKConnect');
      });
  }, [navigator, onboarded, userLoggedIn]);

  useEffect(() => {
    const currentRoute = navigator?.getCurrentRoute();
    if (isWC2Enabled && currentRoute !== undefined) {
      DevLogger.log(
        `WalletConnect: Initializing WalletConnect Manager route=${currentRoute.name}`,
      );
      WC2Manager.init({ navigation: navigator }).catch((err) => {
        console.error('Cannot initialize WalletConnect Manager.', err);
      });
    }
  }, [navigator]);

  useEffect(() => {
    async function startApp() {
      const existingUser = await StorageWrapper.getItem(EXISTING_USER);
      if (!existingUser) {
        // List of chainIds to add (as hex strings)
        const chainIdsToAdd = [
          CHAIN_IDS.ARBITRUM,
          CHAIN_IDS.BASE,
          CHAIN_IDS.BSC,
          CHAIN_IDS.OPTIMISM,
          CHAIN_IDS.POLYGON,
        ];

        // Filter the PopularList to get only the specified networks based on chainId
        const selectedNetworks = PopularList.filter((network) =>
          chainIdsToAdd.includes(network.chainId),
        );
        const { NetworkController } = Engine.context;

        // Loop through each selected network and call NetworkController.addNetwork
        for (const network of selectedNetworks) {
          try {
            await NetworkController.addNetwork({
              chainId: network.chainId,
              blockExplorerUrls: [network.rpcPrefs.blockExplorerUrl],
              defaultRpcEndpointIndex: 0,
              defaultBlockExplorerUrlIndex: 0,
              name: network.nickname,
              nativeCurrency: network.ticker,
              rpcEndpoints: [
                {
                  url: network.rpcUrl,
                  name: network.nickname,
                  type: RpcEndpointType.Custom,
                },
              ],
            });
          } catch (error) {
            Logger.error(error);
          }
        }
      }

      try {
        const currentVersion = getVersion();
        const savedVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);
        if (currentVersion !== savedVersion) {
          if (savedVersion)
            await StorageWrapper.setItem(LAST_APP_VERSION, savedVersion);
          await StorageWrapper.setItem(CURRENT_APP_VERSION, currentVersion);
        }

        const lastVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
        if (!lastVersion) {
          if (existingUser) {
            // Setting last version to first version if user exists and lastVersion does not, to simulate update
            await StorageWrapper.setItem(LAST_APP_VERSION, '0.0.1');
          } else {
            // Setting last version to current version so that it's not treated as an update
            await StorageWrapper.setItem(LAST_APP_VERSION, currentVersion);
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

  /**
   * Triggers when the navigation is ready
   */
  const onNavigationReadyHandler = () => dispatch(onNavigationReady());

  return supressRender ? null : (
    <>
      {
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      }
      <View>
        <SnapsExecutionWebView />
      </View>
      {
        ///: END:ONLY_INCLUDE_IF
      }
      <PPOMView />
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
        onReady={onNavigationReadyHandler}
      >
        <Stack.Navigator
          initialRouteName={Routes.FOX_LOADER}
          mode={'modal'}
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: importedColors.transparent },
            animationEnabled: false,
          }}
        >
          <Stack.Screen name={Routes.FOX_LOADER} component={FoxLoader} />
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
          <Stack.Screen
            name={Routes.ONBOARDING.SUCCESS_FLOW}
            component={OnboardingSuccessFlow}
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
          <Stack.Screen name={Routes.OPTIONS_SHEET} component={OptionsSheet} />
          <Stack.Screen
            name="EditAccountName"
            component={EditAccountName}
            options={{ animationEnabled: true }}
          />
          <Stack.Screen
            name={Routes.ADD_NETWORK}
            component={AddNetworkFlow}
            options={{ animationEnabled: true }}
          />
          {isNetworkUiRedesignEnabled() ? (
            <Stack.Screen
              name={Routes.EDIT_NETWORK}
              component={AddNetworkFlow}
              options={{ animationEnabled: true }}
            />
          ) : null}

          <Stack.Screen
            name={Routes.LOCK_SCREEN}
            component={LockScreen}
            options={{ gestureEnabled: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast ref={toastRef} />
    </>
  );
};

App.propTypes = {
  userLoggedIn: PropTypes.bool.isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      supressRender: PropTypes.bool,
    }),
  }),
};

const mapStateToProps = (state) => ({
  userLoggedIn: state.user.userLoggedIn,
});

export default connect(mapStateToProps)(App);
