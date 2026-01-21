import React, { useState, useEffect, useMemo } from 'react';
import { Image, StyleSheet, Keyboard, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Browser from '../../Views/Browser';
import { ChainId } from '@metamask/controller-utils';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/Settings/GeneralSettings';
import AdvancedSettings from '../../Views/Settings/AdvancedSettings';
import BackupAndSyncSettings from '../../Views/Settings/Identity/BackupAndSyncSettings';
import SecuritySettings from '../../Views/Settings/SecuritySettings';
import ExperimentalSettings from '../../Views/Settings/ExperimentalSettings';
import NotificationsSettings from '../../Views/Settings/NotificationsSettings';
import RegionSelector from '../../Views/Settings/RegionSelector/RegionSelector';
import NotificationsView from '../../Views/Notifications';
import NotificationsDetails from '../../Views/Notifications/Details';
import OptIn from '../../Views/Notifications/OptIn';
import AppInformation from '../../Views/Settings/AppInformation';
import DeveloperOptions from '../../Views/Settings/DeveloperOptions';
import Contacts from '../../Views/Settings/Contacts';
import FeatureFlagOverride from '../../Views/FeatureFlagOverride';
import Wallet from '../../Views/Wallet';
import Asset from '../../Views/Asset';
import AssetDetails from '../../Views/AssetDetails';
import AddAsset from '../../Views/AddAsset';
import Collectible from '../../Views/Collectible';
import NftFullView from '../../Views/NftFullView';
import TokensFullView from '../../Views/TokensFullView';
import TrendingTokensFullView from '../../Views/TrendingTokens/TrendingTokensFullView/TrendingTokensFullView';
import { RevealPrivateCredential } from '../../Views/RevealPrivateCredential';
import WalletConnectSessions from '../../Views/WalletConnectSessions';
import OfflineMode from '../../Views/OfflineMode';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import ChoosePassword from '../../Views/ChoosePassword';
import ResetPassword from '../../Views/ResetPassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import PaymentRequest from '../../UI/PaymentRequest';
import PaymentRequestSuccess from '../../UI/PaymentRequestSuccess';
import { Confirm as RedesignedConfirm } from '../../Views/confirmations/components/confirm';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import ActivityView from '../../Views/ActivityView';
import RewardsNavigator from '../../UI/Rewards/RewardsNavigator';
import { ExploreFeed } from '../../Views/TrendingView/TrendingView';
import ExploreSearchScreen from '../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import CollectiblesDetails from '../../UI/CollectibleModal';
import OptinMetrics from '../../UI/OptinMetrics';

import RampRoutes from '../../UI/Ramp/Aggregator/routes';
import { RampType } from '../../UI/Ramp/Aggregator/types';
import RampSettings from '../../UI/Ramp/Aggregator/Views/Settings';
import RampActivationKeyForm from '../../UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm';
import TokenListRoutes from '../../UI/Ramp/routes';

import DepositOrderDetails from '../../UI/Ramp/Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import DepositRoutes from '../../UI/Ramp/Deposit/routes';

import { colors as importedColors } from '../../../styles/common';
import OrderDetails from '../../UI/Ramp/Aggregator/Views/OrderDetails';
import SendTransaction from '../../UI/Ramp/Aggregator/Views/SendTransaction';
import TabBar from '../../../component-library/components/Navigation/TabBar';
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import { SnapsSettingsList } from '../../Views/Snaps/SnapsSettingsList';
import { SnapSettings } from '../../Views/Snaps/SnapSettings';
///: END:ONLY_INCLUDE_IF
import Routes from '../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import SDKSessionsManager from '../../Views/SDK/SDKSessionsManager/SDKSessionsManager';
import PermissionsManager from '../../Views/Settings/PermissionsSettings/PermissionsManager';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import DeprecatedNetworkDetails from '../../UI/DeprecatedNetworkModal';
import ConfirmAddAsset from '../../UI/ConfirmAddAsset';
import { AesCryptoTestForm } from '../../Views/AesCryptoTestForm';
import { isTest } from '../../../util/test/utils';
import NftDetails from '../../Views/NftDetails';
import NftDetailsFullImage from '../../Views/NftDetails/NFtDetailsFullImage';
import AccountPermissions from '../../../components/Views/AccountPermissions';
import { AccountPermissionsScreens } from '../../../components/Views/AccountPermissions/AccountPermissions.types';
import { StakeModalStack, StakeScreenStack } from '../../UI/Stake/routes';
import { AssetLoader } from '../../Views/AssetLoader';
import { EarnScreenStack, EarnModalStack } from '../../UI/Earn/routes';
import { BridgeTransactionDetails } from '../../UI/Bridge/components/TransactionDetails/TransactionDetails';
import { BridgeModalStack, BridgeScreenStack } from '../../UI/Bridge/routes';
import {
  PerpsScreenStack,
  PerpsModalStack,
  PerpsTutorialCarousel,
  selectPerpsEnabledFlag,
} from '../../UI/Perps';
import {
  PredictScreenStack,
  PredictModalStack,
  selectPredictEnabledFlag,
} from '../../UI/Predict';
import { selectAssetsTrendingTokensEnabled } from '../../../selectors/featureFlagController/assetsTrendingTokens';
import PerpsPositionTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView';
import PerpsOrderTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView';
import PerpsFundingTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsFundingTransactionView';
import TurnOnBackupAndSync from '../../Views/Identity/TurnOnBackupAndSync/TurnOnBackupAndSync';
import DeFiProtocolPositionDetails from '../../UI/DeFiPositions/DeFiProtocolPositionDetails';
import UnmountOnBlur from '../../Views/UnmountOnBlur';
///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import SampleFeature from '../../../features/SampleFeature/components/views/SampleFeature';
///: END:ONLY_INCLUDE_IF
import WalletRecovery from '../../Views/WalletRecovery';
import CardRoutes from '../../UI/Card/routes';
import { Send } from '../../Views/confirmations/components/send';
import { TransactionDetails } from '../../Views/confirmations/components/activity/transaction-details/transaction-details';
import RewardsBottomSheetModal from '../../UI/Rewards/components/RewardsBottomSheetModal';
import RewardsClaimBottomSheetModal from '../../UI/Rewards/components/Tabs/LevelsTab/RewardsClaimBottomSheetModal';
import RewardOptInAccountGroupModal from '../../UI/Rewards/components/Settings/RewardOptInAccountGroupModal';
import ReferralBottomSheetModal from '../../UI/Rewards/components/ReferralBottomSheetModal';
import EndOfSeasonClaimBottomSheet from '../../UI/Rewards/components/EndOfSeasonClaimBottomSheet/EndOfSeasonClaimBottomSheet';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import getHeaderCenterNavbarOptions from '../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions';
import {
  TOKEN_TITLE,
  NFT_TITLE,
  TOKEN,
} from '../../Views/AddAsset/AddAsset.constants';
import { strings } from '../../../../locales/i18n';
import SitesFullView from '../../Views/SitesFullView/SitesFullView';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  headerLogo: {
    width: 125,
    height: 50,
  },
});

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

const WalletModalFlow = () => (
  <Stack.Navigator screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={'Wallet'}
      component={Wallet}
      options={{ headerShown: true, animationEnabled: false }}
    />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const AssetStackFlow = (props) => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen
      name={'Asset'}
      component={Asset}
      initialParams={props.route.params}
    />
    <Stack.Screen
      name={'AssetDetails'}
      component={AssetDetails}
      initialParams={{ address: props.route.params?.address }}
    />
  </Stack.Navigator>
);

const AssetNavigator = (props) => (
  <Stack.Navigator
    initialRouteName={'AssetStackFlow'}
    screenOptions={clearStackNavigatorOptions}
  >
    <Stack.Screen
      name={'AssetStackFlow'}
      component={AssetStackFlow}
      initialParams={props.route.params}
    />
  </Stack.Navigator>
);
/* eslint-enable react/prop-types */

const WalletTabStackFlow = () => (
  <Stack.Navigator initialRouteName={'WalletView'}>
    <Stack.Screen
      name="WalletView"
      component={WalletModalFlow}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="Collectible"
      component={Collectible}
      options={Collectible.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealPrivateCredential}
    />
  </Stack.Navigator>
);

const WalletTabModalFlow = () => (
  <Stack.Navigator screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen
      name={Routes.WALLET.TAB_STACK_FLOW}
      component={WalletTabStackFlow}
    />
  </Stack.Navigator>
);

const TransactionsHome = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.TRANSACTIONS_VIEW}
      component={ActivityView}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.TRANSACTION_DETAILS}
      component={TransactionDetails}
    />
    <Stack.Screen name={Routes.RAMP.ORDER_DETAILS} component={OrderDetails} />
    <Stack.Screen
      name={Routes.DEPOSIT.ORDER_DETAILS}
      component={DepositOrderDetails}
    />
    <Stack.Screen
      name={Routes.RAMP.SEND_TRANSACTION}
      component={SendTransaction}
    />
    <Stack.Screen
      name={Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS}
      component={BridgeTransactionDetails}
    />
  </Stack.Navigator>
);

const RewardsHome = () => (
  <Stack.Navigator screenOptions={clearStackNavigatorOptions}>
    <Stack.Screen name={Routes.REWARDS_VIEW} component={RewardsNavigator} />
    <Stack.Screen
      name={Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL}
      component={RewardsBottomSheetModal}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL}
      component={RewardsClaimBottomSheetModal}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL}
      component={RewardOptInAccountGroupModal}
      options={{ headerShown: false, presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.MODAL.REWARDS_REFERRAL_BOTTOM_SHEET_MODAL}
      component={ReferralBottomSheetModal}
      options={{ presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET}
      component={EndOfSeasonClaimBottomSheet}
      options={{ presentation: 'modal' }}
    />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const BrowserFlow = (props) => (
  <Stack.Navigator
    initialRouteName={Routes.BROWSER.VIEW}
    screenOptions={{
      cardStyle: { backgroundColor: importedColors.transparent },
    }}
  >
    <Stack.Screen
      name={Routes.BROWSER.VIEW}
      component={Browser}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.BROWSER.ASSET_LOADER}
      component={AssetLoader}
      options={{ headerShown: false, animationEnabled: false }}
    />
    <Stack.Screen
      name={Routes.BROWSER.ASSET_VIEW}
      component={Asset}
      initialParams={props.route.params}
    />
  </Stack.Navigator>
);

const ExploreHome = () => (
  <Stack.Navigator initialRouteName={Routes.TRENDING_FEED}>
    <Stack.Screen
      name={Routes.TRENDING_FEED}
      component={ExploreFeed}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
const SnapsSettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsList}
      options={SnapsSettingsList.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SNAPS.SNAP_SETTINGS}
      component={SnapSettings}
      options={SnapSettings.navigationOptions}
    />
  </Stack.Navigator>
);
///: END:ONLY_INCLUDE_IF

const NotificationsOptInStack = () => (
  <Stack.Navigator
    initialRouteName={Routes.NOTIFICATIONS.OPT_IN}
    screenOptions={{ presentation: 'modal' }}
  >
    <Stack.Screen
      name={Routes.NOTIFICATIONS.OPT_IN}
      component={OptIn}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
      options={NotificationsSettings.navigationOptions}
    />
  </Stack.Navigator>
);

const SettingsFlow = () => (
  <Stack.Navigator initialRouteName={'Settings'}>
    <Stack.Screen
      name="Settings"
      component={Settings}
      options={Settings.navigationOptions}
    />
    <Stack.Screen
      name="GeneralSettings"
      component={GeneralSettings}
      options={GeneralSettings.navigationOptions}
    />
    <Stack.Screen
      name="AdvancedSettings"
      component={AdvancedSettings}
      options={AdvancedSettings.navigationOptions}
    />
    <Stack.Screen name="SDKSessionsManager" component={SDKSessionsManager} />
    <Stack.Screen name="PermissionsManager" component={PermissionsManager} />
    <Stack.Screen
      name="SecuritySettings"
      component={SecuritySettings}
      options={SecuritySettings.navigationOptions}
    />

    <Stack.Screen name={Routes.RAMP.SETTINGS} component={RampSettings} />
    <Stack.Screen
      name={Routes.RAMP.ACTIVATION_KEY_FORM}
      component={RampActivationKeyForm}
    />
    {
      /**
       * This screen should only accessed in test mode.
       * It is used to test the AES crypto functions.
       *
       * If this is in production, it is a bug.
       */
      isTest && (
        <Stack.Screen
          name="AesCryptoTestForm"
          component={AesCryptoTestForm}
          options={AesCryptoTestForm.navigationOptions}
        />
      )
    }
    <Stack.Screen
      name="ExperimentalSettings"
      component={ExperimentalSettings}
      options={ExperimentalSettings.navigationOptions}
    />
    <Stack.Screen
      name="CompanySettings"
      component={AppInformation}
      options={AppInformation.navigationOptions}
    />
    {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
      <Stack.Screen
        name={Routes.SETTINGS.DEVELOPER_OPTIONS}
        component={DeveloperOptions}
        options={DeveloperOptions.navigationOptions}
      />
    )}

    <Stack.Screen
      name="ContactsSettings"
      component={Contacts}
      options={Contacts.navigationOptions}
    />
    <Stack.Screen
      name="ContactForm"
      component={ContactForm}
      options={ContactForm.navigationOptions}
    />
    <Stack.Screen
      name="AccountPermissionsAsFullScreen"
      component={AccountPermissions}
      options={{ headerShown: false }}
      initialParams={{
        initialScreen: AccountPermissionsScreens.PermissionsSummary,
      }}
    />
    <Stack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealPrivateCredential}
    />
    <Stack.Screen
      name={Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW}
      component={WalletConnectSessions}
      options={WalletConnectSessions.navigationOptions}
    />
    <Stack.Screen
      name="ResetPassword"
      component={ResetPassword}
      options={ResetPassword.navigationOptions}
    />
    <Stack.Screen
      name="WalletRecovery"
      component={WalletRecovery}
      options={WalletRecovery.navigationOptions}
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
      name="EnterPasswordSimple"
      component={EnterPasswordSimple}
      options={EnterPasswordSimple.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
      options={NotificationsSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SETTINGS.BACKUP_AND_SYNC}
      component={BackupAndSyncSettings}
      options={BackupAndSyncSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SETTINGS.REGION_SELECTOR}
      component={RegionSelector}
      options={RegionSelector.navigationOptions}
    />
    {
      ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
    }
    <Stack.Screen
      name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
      component={SnapsSettingsStack}
      options={{ headerShown: false }}
    />
    {
      ///: END:ONLY_INCLUDE_IF
    }
  </Stack.Navigator>
);

const UnmountOnBlurComponent = (children) => (
  <UnmountOnBlur>{children}</UnmountOnBlur>
);

const HomeTabs = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  const accountsLength = useSelector(selectAccountsLength);
  const rewardsSubscription = useSelector(selectRewardsSubscriptionId);
  const isAssetsTrendingTokensEnabled = useSelector(
    selectAssetsTrendingTokensEnabled,
  );

  const chainId = useSelector((state) => {
    const providerConfig = selectProviderConfig(state);
    return ChainId[providerConfig.type];
  });

  const amountOfBrowserOpenTabs = useSelector(
    (state) => state.browser.tabs.length,
  );

  const options = {
    home: {
      tabBarIconKey: TabBarIconKey.Wallet,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.WALLET_OPENED)
            .addProperties({
              number_of_accounts: accountsLength,
              chain_id: getDecimalChainId(chainId),
            })
            .build(),
        );
      },
      rootScreenName: Routes.WALLET_VIEW,
    },
    trade: {
      tabBarIconKey: TabBarIconKey.Trade,
      rootScreenName: Routes.MODAL.TRADE_WALLET_ACTIONS,
    },
    browser: {
      tabBarIconKey: TabBarIconKey.Browser,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BROWSER_OPENED)
            .addProperties({
              number_of_accounts: accountsLength,
              chain_id: getDecimalChainId(chainId),
              source: 'Navigation Tab',
              number_of_open_tabs: amountOfBrowserOpenTabs,
            })
            .build(),
        );
      },
      rootScreenName: Routes.BROWSER_VIEW,
      unmountOnBlur: true,
    },
    activity: {
      tabBarIconKey: TabBarIconKey.Activity,
      callback: () => {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.NAVIGATION_TAPS_TRANSACTION_HISTORY,
          ).build(),
        );
      },
      rootScreenName: Routes.TRANSACTIONS_VIEW,
      unmountOnBlur: true,
    },
    rewards: {
      tabBarIconKey: TabBarIconKey.Rewards,
      callback: () => {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_REWARDS).build(),
        );
      },
      rootScreenName: Routes.REWARDS_VIEW,
      unmountOnBlur: true,
    },
    trending: {
      tabBarIconKey: TabBarIconKey.Trending,
      callback: () => {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.NAVIGATION_TAPS_TRENDING,
          ).build(),
        );
      },
      rootScreenName: Routes.TRENDING_VIEW,
      unmountOnBlur: false,
    },
    settings: {
      tabBarIconKey: TabBarIconKey.Setting,
      callback: () => {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.NAVIGATION_TAPS_SETTINGS,
          ).build(),
        );
      },
      rootScreenName: Routes.SETTINGS_VIEW,
      unmountOnBlur: true,
    },
  };

  useEffect(() => {
    // Hide keyboard on Android when keyboard is visible.
    // Better solution would be to update android:windowSoftInputMode in the AndroidManifest and refactor pages to support it.
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
        setIsKeyboardHidden(false);
      });
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setIsKeyboardHidden(true);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  const renderTabBar = ({ state, descriptors, navigation }) => {
    const currentRoute = state.routes[state.index];

    // Hide tab bar for rewards onboarding splash screen
    if (currentRoute.name?.startsWith('Rewards') && !rewardsSubscription) {
      return null;
    }

    // Hide tab bar when in browser
    const currentStackRouteName =
      currentRoute?.state?.routes?.[currentRoute?.state?.index]?.name;
    const isInBrowser =
      currentRoute.name?.startsWith(Routes.BROWSER.HOME) ||
      currentStackRouteName?.startsWith(Routes.BROWSER.HOME);
    if (isInBrowser) {
      return null;
    }

    if (isKeyboardHidden) {
      return (
        <TabBar
          state={state}
          descriptors={descriptors}
          navigation={navigation}
        />
      );
    }
    return null;
  };

  return (
    <Tab.Navigator
      initialRouteName={Routes.WALLET.HOME}
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name={Routes.WALLET.HOME}
        options={options.home}
        component={WalletTabModalFlow}
      />
      {isAssetsTrendingTokensEnabled ? (
        <>
          <Tab.Screen
            name={Routes.TRENDING_VIEW}
            options={{
              ...options.trending,
              isSelected: (rootScreenName) =>
                [Routes.TRENDING_VIEW, Routes.BROWSER.HOME].includes(
                  rootScreenName,
                ),
            }}
            component={ExploreHome}
          />
          <Tab.Screen
            name={Routes.BROWSER.HOME}
            options={{
              ...options.browser,
              isHidden: true,
            }}
            component={BrowserFlow}
            layout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
          />
        </>
      ) : (
        <Tab.Screen
          name={Routes.BROWSER.HOME}
          options={options.browser}
          component={BrowserFlow}
          layout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
        />
      )}
      <Tab.Screen
        name={Routes.MODAL.TRADE_WALLET_ACTIONS}
        options={options.trade}
        component={WalletTabModalFlow}
      />
      <Tab.Screen
        name={Routes.TRANSACTIONS_VIEW}
        options={options.activity}
        component={TransactionsHome}
        layout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
      />
      <Tab.Screen
        name={Routes.REWARDS_VIEW}
        options={options.rewards}
        component={RewardsHome}
        layout={({ children }) => UnmountOnBlurComponent(children)}
      />
    </Tab.Navigator>
  );
};

const Webview = () => (
  <Stack.Navigator screenOptions={{ presentation: 'modal' }}>
    <Stack.Screen name="SimpleWebview" component={SimpleWebview} />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const NftDetailsModeView = (props) => (
  <Stack.Navigator>
    <Stack.Screen
      name=" " // No name here because this title will be displayed in the header of the page
      component={NftDetails}
      initialParams={{
        collectible: props.route.params?.collectible,
      }}
    />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const NftDetailsFullImageModeView = (props) => (
  <Stack.Navigator>
    <Stack.Screen
      name=" " // No name here because this title will be displayed in the header of the page
      component={NftDetailsFullImage}
      initialParams={{
        collectible: props.route.params?.collectible,
      }}
    />
  </Stack.Navigator>
);

const AddBookmarkView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AddBookmark"
      component={AddBookmark}
      options={AddBookmark.navigationOptions}
    />
  </Stack.Navigator>
);

const OfflineModeView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="OfflineMode"
      component={OfflineMode}
      options={OfflineMode.navigationOptions}
    />
  </Stack.Navigator>
);

const PaymentRequestView = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="PaymentRequest"
      component={PaymentRequest}
      options={PaymentRequest.navigationOptions}
    />
    <Stack.Screen
      name="PaymentRequestSuccess"
      component={PaymentRequestSuccess}
      options={PaymentRequestSuccess.navigationOptions}
    />
  </Stack.Navigator>
);

/* eslint-disable react/prop-types */
const NotificationsModeView = (props) => (
  <Stack.Navigator>
    <Stack.Screen
      name={Routes.NOTIFICATIONS.VIEW}
      component={NotificationsView}
      options={NotificationsView.navigationOptions}
    />
    <Stack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
      options={NotificationsSettings.navigationOptions}
    />
    <Stack.Screen
      name={Routes.NOTIFICATIONS.OPT_IN}
      component={OptIn}
      options={{ ...OptIn.navigationOptions, presentation: 'modal' }}
    />
    <Stack.Screen
      name={Routes.NOTIFICATIONS.DETAILS}
      component={NotificationsDetails}
      options={NotificationsDetails.navigationOptions}
    />
    <Stack.Screen
      name="ContactForm"
      component={ContactForm}
      options={ContactForm.navigationOptions}
    />
  </Stack.Navigator>
);

const SetPasswordFlow = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ChoosePassword"
      component={ChoosePassword}
      options={ChoosePassword.navigationOptions}
    />
    <Stack.Screen
      name="AccountBackupStep1"
      component={AccountBackupStep1}
      options={{ headerShown: false, gestureEnabled: false }}
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
      name="OptinMetrics"
      component={OptinMetrics}
      options={OptinMetrics.navigationOptions}
    />
  </Stack.Navigator>
);

///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
const SampleFeatureFlow = () => (
  <Stack.Navigator>
    <Stack.Screen name={Routes.SAMPLE_FEATURE} component={SampleFeature} />
  </Stack.Navigator>
);
///: END:ONLY_INCLUDE_IF

const MainNavigator = () => {
  // Get feature flag state for conditional Perps screen registration
  const perpsEnabledFlag = useSelector(selectPerpsEnabledFlag);
  const isPerpsEnabled = useMemo(() => perpsEnabledFlag, [perpsEnabledFlag]);
  // Get feature flag state for conditional Predict screen registration
  const predictEnabledFlag = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => predictEnabledFlag,
    [predictEnabledFlag],
  );
  // Get feature flag state for conditional Trending Tokens screen registration
  const isAssetsTrendingTokensEnabled = useSelector(
    selectAssetsTrendingTokensEnabled,
  );

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={'Home'}
    >
      <Stack.Screen
        name="CollectiblesDetails"
        component={CollectiblesDetails}
        options={{
          //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
          cardStyle: { backgroundColor: importedColors.transparent },
          cardStyleInterpolator: () => ({
            overlayStyle: {
              opacity: 0,
            },
          }),
        }}
      />
      <Stack.Screen
        name={Routes.DEPRECATED_NETWORK_DETAILS}
        component={DeprecatedNetworkDetails}
        options={{
          //Refer to - https://reactnavigation.org/docs/stack-navigator/#animations
          cardStyle: { backgroundColor: importedColors.transparent },
          cardStyleInterpolator: () => ({
            overlayStyle: {
              opacity: 0,
            },
          }),
        }}
      />
      <Stack.Screen name="Home" component={HomeTabs} />
      <Stack.Screen
        name={Routes.WALLET.TOKENS_FULL_VIEW}
        component={TokensFullView}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddAsset"
        component={AddAsset}
        options={({ route, navigation }) => ({
          ...getHeaderCenterNavbarOptions({
            title: strings(
              `add_asset.${route.params?.assetType === TOKEN ? TOKEN_TITLE : NFT_TITLE}`,
            ),
            onBack: () => navigation.goBack(),
            includesTopInset: true,
          }),
          headerShown: true,
        })}
      />
      <Stack.Screen
        name="ConfirmAddAsset"
        component={ConfirmAddAsset}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name={Routes.SETTINGS_VIEW}
        component={SettingsFlow}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="Asset"
        component={AssetNavigator}
        options={{
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="TrendingTokensFullView"
        component={TrendingTokensFullView}
        options={{
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />

      <Stack.Screen name="Webview" component={Webview} />
      <Stack.Screen
        name="Send"
        component={Send}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="AddBookmarkView" component={AddBookmarkView} />
      <Stack.Screen name="OfflineModeView" component={OfflineModeView} />
      <Stack.Screen
        name={Routes.NOTIFICATIONS.VIEW}
        component={NotificationsModeView}
      />
      <Stack.Screen name={Routes.QR_TAB_SWITCHER} component={QRTabSwitcher} />
      <Stack.Screen
        name="NftDetails"
        component={NftDetailsModeView}
        options={{
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name="NftDetailsFullImage"
        component={NftDetailsFullImageModeView}
        options={{
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen
        name={Routes.WALLET.NFTS_FULL_VIEW}
        component={NftFullView}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="PaymentRequestView" component={PaymentRequestView} />
      <Stack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={TokenListRoutes}
      />
      <Stack.Screen name={Routes.RAMP.BUY}>
        {() => <RampRoutes rampType={RampType.BUY} />}
      </Stack.Screen>
      <Stack.Screen name={Routes.RAMP.SELL}>
        {() => <RampRoutes rampType={RampType.SELL} />}
      </Stack.Screen>
      <Stack.Screen name={Routes.DEPOSIT.ID} component={DepositRoutes} />
      <Stack.Screen name={Routes.BRIDGE.ROOT} component={BridgeScreenStack} />
      <Stack.Screen
        name={Routes.BRIDGE.MODALS.ROOT}
        component={BridgeModalStack}
        options={clearStackNavigatorOptions}
      />
      <Stack.Screen
        name="StakeScreens"
        component={StakeScreenStack}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      <Stack.Screen name={Routes.EARN.ROOT} component={EarnScreenStack} />
      <Stack.Screen
        name={Routes.EARN.MODALS.ROOT}
        component={EarnModalStack}
        options={clearStackNavigatorOptions}
      />
      <Stack.Screen
        name="StakeModals"
        component={StakeModalStack}
        options={clearStackNavigatorOptions}
      />
      {isPerpsEnabled && (
        <>
          <Stack.Screen
            name={Routes.PERPS.ROOT}
            component={PerpsScreenStack}
            options={{
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.TUTORIAL}
            component={PerpsTutorialCarousel}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.MODALS.ROOT}
            component={PerpsModalStack}
            options={clearStackNavigatorOptions}
          />
        </>
      )}
      {isPerpsEnabled && (
        <>
          <Stack.Screen
            name={Routes.PERPS.POSITION_TRANSACTION}
            component={PerpsPositionTransactionView}
            options={{
              title: 'Position Transaction',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.ORDER_TRANSACTION}
            component={PerpsOrderTransactionView}
            options={{
              title: 'Order Transaction',
              headerShown: true,
            }}
          />
          <Stack.Screen
            name={Routes.PERPS.FUNDING_TRANSACTION}
            component={PerpsFundingTransactionView}
            options={{
              title: 'Funding Transaction',
              headerShown: true,
            }}
          />
        </>
      )}
      {isPredictEnabled && (
        <>
          <Stack.Screen
            name={Routes.PREDICT.ROOT}
            component={PredictScreenStack}
            options={{
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
          <Stack.Screen
            name={Routes.PREDICT.MODALS.ROOT}
            component={PredictModalStack}
            options={clearStackNavigatorOptions}
          />
        </>
      )}
      {isAssetsTrendingTokensEnabled && (
        <>
          <Stack.Screen
            name={Routes.EXPLORE_SEARCH}
            component={ExploreSearchScreen}
            options={{
              headerShown: false,
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
          <Stack.Screen
            name={Routes.SITES_FULL_VIEW}
            component={SitesFullView}
            options={{
              headerShown: false,
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
          <Stack.Screen
            name={Routes.BROWSER.HOME}
            component={BrowserFlow}
            options={{
              headerShown: false,
              animationEnabled: true,
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
        </>
      )}
      <Stack.Screen
        name="SetPasswordFlow"
        component={SetPasswordFlow}
        headerTitle={() => (
          <Image
            style={styles.headerLogo}
            source={require('../../../images/branding/metamask-name.png')}
            resizeMode={'contain'}
          />
        )}
        // eslint-disable-next-line react-native/no-inline-styles
        headerStyle={{ borderBottomWidth: 0 }}
      />
      {/* TODO: This is added to support slide 4 in the carousel - once changed this can be safely removed*/}
      <Stack.Screen
        name="GeneralSettings"
        component={GeneralSettings}
        options={{
          headerShown: true,
          ...GeneralSettings.navigationOptions,
        }}
      />
      {process.env.METAMASK_ENVIRONMENT !== 'production' && (
        <Stack.Screen
          name={Routes.FEATURE_FLAG_OVERRIDE}
          component={FeatureFlagOverride}
          options={{
            headerShown: true,
          }}
        />
      )}
      <Stack.Screen
        name={Routes.NOTIFICATIONS.OPT_IN_STACK}
        component={NotificationsOptInStack}
        options={NotificationsOptInStack.navigationOptions}
      />
      <Stack.Screen
        name={Routes.IDENTITY.TURN_ON_BACKUP_AND_SYNC}
        component={TurnOnBackupAndSync}
        options={TurnOnBackupAndSync.navigationOptions}
      />
      <Stack.Screen
        name="DeFiProtocolPositionDetails"
        component={DeFiProtocolPositionDetails}
        options={{
          headerShown: true,
          animationEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      }
      <Stack.Screen
        name={Routes.SAMPLE_FEATURE}
        component={SampleFeatureFlow}
      />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      <Stack.Screen name={Routes.CARD.ROOT} component={CardRoutes} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
