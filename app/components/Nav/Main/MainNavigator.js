import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Image, StyleSheet, Keyboard, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { mainNavigatorReady } from '../../../actions/navigation';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Browser from '../../Views/Browser';
import { ChainId } from '@metamask/controller-utils';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import AccountsMenu from '../../Views/AccountsMenu';
import Settings from '../../Views/Settings';
import GeneralSettings from '../../Views/Settings/GeneralSettings';
import AdvancedSettings from '../../Views/Settings/AdvancedSettings';
import BackupAndSyncSettings from '../../Views/Settings/Identity/BackupAndSyncSettings';
import SecuritySettings from '../../Views/Settings/SecuritySettings';
import NetworksManagementView from '../../Views/NetworksManagement/NetworksManagementView';
import NetworkDetailsView from '../../Views/NetworksManagement/NetworkDetailsView';
import ExperimentalSettings from '../../Views/Settings/ExperimentalSettings';
import NotificationsSettings from '../../Views/Settings/NotificationsSettings';
import NotificationSettingsSection from '../../Views/Settings/NotificationsSettings/NotificationSettingsSection';
import RegionSelector from '../../UI/Ramp/Views/Settings/RegionSelector/RegionSelector';
import NotificationsView from '../../Views/Notifications';
import NotificationsDetails from '../../Views/Notifications/Details';
import AppInformation from '../../Views/Settings/AppInformation';
import DeveloperOptions from '../../Views/Settings/DeveloperOptions';
import Contacts from '../../Views/Settings/Contacts';
import FeatureFlagOverride from '../../Views/FeatureFlagOverride';
import Wallet from '../../Views/Wallet';
import SecurityTrustScreen from '../../UI/SecurityTrust/Views/SecurityTrustScreen';
import AddAsset from '../../Views/AddAsset/AddAsset';
import NftFullView from '../../Views/NftFullView';
import TokensFullView from '../../Views/TokensFullView';
import DeFiFullView from '../../Views/DeFiFullView';
import CashTokensFullView from '../../Views/CashTokensFullView';
import WatchlistFullScreenView from '../../UI/Assets/watchlist/Views/WatchlistFullScreenView';
import TrendingTokensFullView from '../../UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView';
import RWATokensFullView from '../../UI/Trending/Views/RWATokensFullView/RWATokensFullView';
import { RevealPrivateCredential } from '../../Views/RevealPrivateCredential';
import WalletConnectSessions from '../../Views/WalletConnectSessions';
import OfflineMode from '../../Views/OfflineMode';
import QRTabSwitcher from '../../Views/QRTabSwitcher';
import AddDeviceToWallet from '../../Views/AddDeviceToWallet';
import VerificationCodeBottomSheet from '../../Views/AddDeviceToWallet/VerificationCodeBottomSheet';
import EnterPasswordSimple from '../../Views/EnterPasswordSimple';
import ChoosePassword from '../../Views/ChoosePassword';
import ResetPassword from '../../Views/ResetPassword';
import AccountBackupStep1 from '../../Views/AccountBackupStep1';
import AccountBackupStep1B from '../../Views/AccountBackupStep1B';
import ManualBackupStep1 from '../../Views/ManualBackupStep1';
import ManualBackupStep2 from '../../Views/ManualBackupStep2';
import ManualBackupStep3 from '../../Views/ManualBackupStep3';
import ContactForm from '../../Views/Settings/Contacts/ContactForm';
import ActivityView from '../../Views/ActivityView';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import useRewardsVersionGuard from '../../UI/Rewards/hooks/useRewardsVersionGuard';
import { useCandidateSubscriptionId } from '../../UI/Rewards/hooks/useCandidateSubscriptionId';
import RewardsUpdateRequired from '../../UI/Rewards/components/RewardsUpdateRequired/RewardsUpdateRequired';
import RewardsNavigator from '../../UI/Rewards/RewardsNavigator';
import RewardsDashboard from '../../UI/Rewards/Views/RewardsDashboard';
import RewardsOnboardingNavigator from '../../UI/Rewards/OnboardingNavigator';
import { ExploreFeed } from '../../Views/TrendingView/TrendingView';
import WhatsHappeningDetailView from '../../Views/WhatsHappeningDetailView';
import ExploreSearchScreen from '../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import OptinMetrics from '../../UI/OptinMetrics';

import RampRoutes from '../../UI/Ramp/Aggregator/routes';
import { RampType } from '../../UI/Ramp/Aggregator/types';
import RampSettings from '../../UI/Ramp/Aggregator/Views/Settings';
import RampActivationKeyForm from '../../UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm';
import RampHeadlessPlayground from '../../UI/Ramp/Views/HeadlessPlayground';
import TokenListRoutes from '../../UI/Ramp/routes';

import V2BankDetails from '../../UI/Ramp/Views/NativeFlow/BankDetails';

import { colors as importedColors } from '../../../styles/common';
import OrderDetails from '../../UI/Ramp/Aggregator/Views/OrderDetails';
import RampsOrderDetails from '../../UI/Ramp/Views/OrderDetails';
import DepositOrderDetails from '../../UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails';
import ProcessingInfoModal from '../../UI/Ramp/Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import SendTransaction from '../../UI/Ramp/Aggregator/Views/SendTransaction';
import TabBar from '../../../component-library/components/Navigation/TabBar';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { SnapsSettingsList } from '../../Views/Snaps/SnapsSettingsList';
import {
  SnapSettings,
  ALLOWED_CAPABILITIES as SNAPS_SETTINGS_ROUTE_ALLOWED_CAPABILITIES,
} from '../../Views/Snaps/SnapSettings';
import { CAN_INSTALL_THIRD_PARTY_SNAPS } from '../../../constants/snaps';
///: END:ONLY_INCLUDE_IF
import Routes from '../../../constants/navigation/Routes';
import {
  clearNativeStackNavigatorOptions,
  addDeviceVerificationCodeScreenOptions,
  transparentModalScreenOptions,
  slideFromRightNativeOptions,
  fadeNativeOptions,
  fullScreenModalSlideFromBottomNativeOptions,
} from '../../../constants/navigation/clearStackNavigatorOptions';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { TabBarIconKey } from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import { selectProviderConfig } from '../../../selectors/networkController';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import SDKSessionsManager from '../../Views/SDK/SDKSessionsManager/SDKSessionsManager';
import { getDecimalChainId } from '../../../util/networks';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { useTheme } from '../../../util/theme';
import DeprecatedNetworkDetails from '../../UI/DeprecatedNetworkModal';
import ConfirmAddAsset from '../../Views/AddAsset/Views/ConfirmAddTokenView/ConfirmAddAsset';
import { AesCryptoTestForm } from '../../Views/AesCryptoTestForm';
import AuthDebugging from '../../Views/Settings/AuthDebugging';
import { isTestEnvironment } from '../../../util/test/utils';
import NftDetails from '../../Views/NftDetails';
import NftDetailsFullImage from '../../Views/NftDetails/NFtDetailsFullImage';
import { StakeModalStack, StakeScreenStack } from '../../UI/Stake/routes';
import { AssetLoader } from '../../Views/AssetLoader';
import { EarnScreenStack, EarnModalStack } from '../../UI/Earn/routes';
import {
  MoneyConfirmationScreenStack,
  MoneyModalStack,
  MoneyTabScreenStack,
} from '../../UI/Money/routes';
import MoneyOnboardingView from '../../UI/Money/Views/MoneyOnboardingView';
import MoneyPotentialEarningsView from '../../UI/Money/Views/MoneyPotentialEarningsView';
import MoneyFirstTimeDepositView from '../../UI/Money/Views/MoneyFirstTimeDepositView';
import { selectMoneyEnableMoneyAccountFlag } from '../../UI/Money/selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../UI/Money/selectors/eligibility';
import { BridgeTransactionDetails } from '../../UI/Bridge/components/TransactionDetails/TransactionDetails';
import { BridgeModalStack, BridgeScreenStack } from '../../UI/Bridge/routes';
import {
  PerpsScreenStack,
  PerpsModalStackWithErrorGate,
  PerpsTutorialCarousel,
  selectPerpsEnabledFlag,
} from '../../UI/Perps';
import {
  PredictScreenStack,
  PredictModalStack,
  PredictPreviewSheetProvider,
  selectPredictEnabledFlag,
} from '../../UI/Predict';
import {
  MarketInsightsView,
  selectMarketInsightsEnabled,
} from '../../UI/MarketInsights';
import { selectMarketInsightsPerpsEnabled } from '../../../selectors/featureFlagController/marketInsights';
import {
  SocialTradersView,
  TraderProfileView,
  TraderPositionView,
  SocialLeaderboardOnboarding,
  TradingSignalsSetupBottomSheet,
} from '../../Views/SocialLeaderboard';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import PerpsPositionTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView';
import PerpsOrderTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView';
import PerpsFundingTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsFundingTransactionView';
import DeFiProtocolPositionDetails from '../../UI/DeFiPositions/DeFiProtocolPositionDetails';
import UnmountOnBlur from '../../Views/UnmountOnBlur';
///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import SampleFeature from '../../../features/SampleFeature/components/views/SampleFeature';
///: END:ONLY_INCLUDE_IF
import WalletRecovery from '../../Views/WalletRecovery';
import CardRoutes from '../../UI/Card/routes';
import { Send } from '../../Views/confirmations/components/send';
import { TransactionDetails } from '../../Views/confirmations/components/activity/transaction-details/transaction-details';
import ActivityDetails from '../../Views/ActivityDetails';
import { MoneyApiActivityDetailsView } from '../../UI/Money/Views/MoneyApiActivityDetailsView';
import RewardsBottomSheetModal from '../../UI/Rewards/components/RewardsBottomSheetModal';
import RewardsClaimBottomSheetModal from '../../UI/Rewards/components/Tabs/LevelsTab/RewardsClaimBottomSheetModal';
import RewardOptInAccountGroupModal from '../../UI/Rewards/components/Settings/RewardOptInAccountGroupModal';
import EndOfSeasonClaimBottomSheet from '../../UI/Rewards/components/EndOfSeasonClaimBottomSheet/EndOfSeasonClaimBottomSheet';
import RewardsSelectSheet from '../../UI/Rewards/components/RewardsSelectSheet';

import SitesFullView from '../../Views/SitesFullView/SitesFullView';
import { TokenDetails } from '../../UI/TokenDetails/Views/TokenDetails';
import CreatePriceAlertView from '../../UI/Assets/PriceAlerts/Views/CreatePriceAlertView/CreatePriceAlertView';
import ManagePriceAlertsView from '../../UI/Assets/PriceAlerts/Views/ManagePriceAlertsView/ManagePriceAlertsView';
import BenefitFullView from '../../UI/Rewards/Views/BenefitFullView';
import BenefitsFullView from '../../UI/Rewards/Views/BenefitsFullView';
import MoneyTabPressTracker from '../../UI/Money/components/MoneyTabPressTracker';
import { withMessenger } from '../../../messengers/helpers/route-messenger-helpers';
import MoneyDeeplinkModal from '../../UI/Money/components/MoneyDeeplinkModal/MoneyDeeplinkModal';

const NativeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  headerLogo: {
    width: 125,
    height: 50,
  },
});

// Registered on the root MainNavigator so sheets are reachable from both the
// Rewards tab (dashboard/onboarding) and REWARDS_FLOW sub-pages. Use
// animation: 'none' so only the BottomSheet's internal slide runs — without it
// the native stack slides the entire screen (overlay included) from the bottom.
const rewardsModalScreenOptions = {
  ...clearNativeStackNavigatorOptions,
  ...transparentModalScreenOptions,
};

/* eslint-disable react/prop-types */
const AssetStackFlow = (props) => (
  <NativeStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <NativeStack.Screen
      name={'Asset'}
      component={TokenDetails}
      initialParams={props.route.params}
    />
    <NativeStack.Screen
      name={Routes.SECURITY_TRUST}
      component={SecurityTrustScreen}
    />
    <NativeStack.Screen
      name={Routes.CREATE_PRICE_ALERT}
      component={CreatePriceAlertView}
    />
    <NativeStack.Screen
      name={Routes.MANAGE_PRICE_ALERTS}
      component={ManagePriceAlertsView}
    />
  </NativeStack.Navigator>
);

const AssetNavigator = (props) => (
  <NativeStack.Navigator
    initialRouteName={'AssetStackFlow'}
    screenOptions={clearNativeStackNavigatorOptions}
  >
    <NativeStack.Screen
      name={'AssetStackFlow'}
      component={AssetStackFlow}
      initialParams={props.route.params}
    />
  </NativeStack.Navigator>
);
/* eslint-enable react/prop-types */

const WalletTabStackFlow = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      initialRouteName={'WalletView'}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name="WalletView"
        component={Wallet}
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateCredential}
        options={{ headerShown: false }}
      />
    </NativeStack.Navigator>
  );
};

const TransactionsHome = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.TRANSACTIONS_VIEW}
        component={ActivityView}
      />
      <NativeStack.Screen
        name={Routes.RAMP.ORDER_DETAILS}
        component={OrderDetails}
      />
      <NativeStack.Screen
        name={Routes.RAMP.RAMPS_ORDER_DETAILS}
        component={RampsOrderDetails}
      />
      <NativeStack.Screen
        name={Routes.DEPOSIT.ORDER_DETAILS}
        component={DepositOrderDetails}
      />
      <NativeStack.Screen
        name={Routes.RAMP.BANK_DETAILS_STANDALONE}
        component={V2BankDetails}
      />
      <NativeStack.Screen
        name={Routes.RAMP.SEND_TRANSACTION}
        component={SendTransaction}
      />
      <NativeStack.Screen
        name={Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS}
        component={BridgeTransactionDetails}
      />
    </NativeStack.Navigator>
  );
};

const RewardsHome = () => {
  const { colors } = useTheme();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVersionBlocked = useSelector(selectIsRewardsVersionBlocked);
  // Fetch client version requirements at the Rewards tab entry point, before the
  // onboarding/dashboard branch below. Both opted-in and onboarding users mount
  // RewardsHome, so gating here ensures version-blocked clients always see the
  // update-required screen (and the requirements are always fetched), regardless
  // of subscription status.
  useRewardsVersionGuard();
  // Resolve the candidate subscription ID here for the same reason: both the
  // dashboard and onboarding branches depend on it (onboarding's OnboardingMainStep
  // renders a full-screen skeleton until candidateSubscriptionId leaves its initial
  // 'pending' state). Only RewardsHome mounts for non-opted-in users, so fetching at
  // this shared entry point prevents the onboarding tab from loading indefinitely.
  useCandidateSubscriptionId();

  if (isVersionBlocked) {
    return <RewardsUpdateRequired />;
  }

  return (
    <NativeStack.Navigator
      initialRouteName={
        subscriptionId
          ? Routes.REWARDS_DASHBOARD
          : Routes.REWARDS_ONBOARDING_FLOW
      }
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.REWARDS_ONBOARDING_FLOW}
        component={RewardsOnboardingNavigator}
      />
      <NativeStack.Screen
        name={Routes.REWARDS_DASHBOARD}
        component={RewardsDashboard}
        options={slideFromRightNativeOptions}
      />
    </NativeStack.Navigator>
  );
};

/* eslint-disable react/prop-types */
const BrowserFlow = (props) => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      initialRouteName={Routes.BROWSER.VIEW}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.BROWSER.VIEW}
        component={Browser}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.BROWSER.ASSET_LOADER}
        component={AssetLoader}
        options={{
          headerShown: false,
          animation: 'none',
          presentation: 'modal',
        }}
      />
      <NativeStack.Screen
        name={Routes.BROWSER.ASSET_VIEW}
        component={TokenDetails}
        initialParams={props.route.params}
        options={{ presentation: 'modal' }}
      />
    </NativeStack.Navigator>
  );
};

const ExploreHome = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      initialRouteName={Routes.TRENDING_FEED}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background.default },
        headerShown: false,
      }}
    >
      <NativeStack.Screen name={Routes.TRENDING_FEED} component={ExploreFeed} />
    </NativeStack.Navigator>
  );
};

///: BEGIN:ONLY_INCLUDE_IF(snaps)
const SnapSettingsWithMessenger = withMessenger(SnapSettings, {
  capabilities: SNAPS_SETTINGS_ROUTE_ALLOWED_CAPABILITIES,
});

const SnapsSettingsStack = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
        component={SnapsSettingsList}
      />
      <NativeStack.Screen
        name={Routes.SNAPS.SNAP_SETTINGS}
        component={SnapSettingsWithMessenger}
      />
    </NativeStack.Navigator>
  );
};
///: END:ONLY_INCLUDE_IF

const SettingsFlow = () => {
  const { colors } = useTheme();
  return (
    <NativeStack.Navigator
      initialRouteName={Routes.ACCOUNTS_MENU_VIEW}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
    >
      <NativeStack.Screen
        name={Routes.ACCOUNTS_MENU_VIEW}
        component={AccountsMenu}
      />
      <NativeStack.Screen name="Settings" component={Settings} />
      <NativeStack.Screen name="GeneralSettings" component={GeneralSettings} />
      <NativeStack.Screen
        name="AdvancedSettings"
        component={AdvancedSettings}
      />
      <NativeStack.Screen
        name="NetworksManagement"
        component={NetworksManagementView}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.NETWORK_DETAILS}
        component={NetworkDetailsView}
      />
      <NativeStack.Screen
        name="SDKSessionsManager"
        component={SDKSessionsManager}
      />
      <NativeStack.Screen
        name="SecuritySettings"
        component={SecuritySettings}
      />
      <NativeStack.Screen
        name={Routes.RAMP.SETTINGS}
        component={RampSettings}
      />
      <NativeStack.Screen
        name={Routes.RAMP.ACTIVATION_KEY_FORM}
        component={RampActivationKeyForm}
      />
      <NativeStack.Screen
        name={Routes.RAMP.HEADLESS_PLAYGROUND}
        component={RampHeadlessPlayground}
      />
      {
        /**
         * This screen should only accessed in test mode.
         * It is used to test the AES crypto functions.
         *
         * If this is in production, it is a bug.
         */
        isTestEnvironment && (
          <NativeStack.Screen
            name="AesCryptoTestForm"
            component={AesCryptoTestForm}
          />
        )
      }
      {
        /**
         * This screen should only be accessed in local development / test mode.
         * It exposes the current MetaMask authentication session (profile ID
         * and mm-auth JWT) for debugging purposes.
         *
         * If this is in production, it is a bug.
         */
        isTestEnvironment && (
          <NativeStack.Screen
            name={Routes.SETTINGS.AUTH_DEBUGGING}
            component={AuthDebugging}
          />
        )
      }
      <NativeStack.Screen
        name="ExperimentalSettings"
        component={ExperimentalSettings}
      />
      <NativeStack.Screen name="CompanySettings" component={AppInformation} />
      {process.env.MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS === 'true' && (
        <NativeStack.Screen
          name={Routes.SETTINGS.DEVELOPER_OPTIONS}
          component={DeveloperOptions}
        />
      )}
      <NativeStack.Screen name="ContactsSettings" component={Contacts} />
      <NativeStack.Screen name="ContactForm" component={ContactForm} />
      <NativeStack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateCredential}
      />
      <NativeStack.Screen
        name={Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW}
        component={WalletConnectSessions}
      />
      <NativeStack.Screen name="ResetPassword" component={ResetPassword} />
      <NativeStack.Screen name="WalletRecovery" component={WalletRecovery} />
      <NativeStack.Screen
        name="AccountBackupStep1B"
        component={AccountBackupStep1B}
      />
      <NativeStack.Screen
        name="ManualBackupStep1"
        component={ManualBackupStep1}
      />
      <NativeStack.Screen
        name="ManualBackupStep2"
        component={ManualBackupStep2}
      />
      <NativeStack.Screen
        name="ManualBackupStep3"
        component={ManualBackupStep3}
      />
      <NativeStack.Screen
        name="EnterPasswordSimple"
        component={EnterPasswordSimple}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.NOTIFICATIONS}
        component={NotificationsSettings}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}
        component={NotificationSettingsSection}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.BACKUP_AND_SYNC}
        component={BackupAndSyncSettings}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.REGION_SELECTOR}
        component={RegionSelector}
      />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      }
      {CAN_INSTALL_THIRD_PARTY_SNAPS && (
        <NativeStack.Screen
          name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
          component={SnapsSettingsStack}
        />
      )}
      {
        ///: END:ONLY_INCLUDE_IF
      }
    </NativeStack.Navigator>
  );
};

const UnmountOnBlurComponent = (children) => (
  <UnmountOnBlur>{children}</UnmountOnBlur>
);

const HomeTabs = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const isMoneyAccountVisible =
    isMoneyAccountEnabled && isMoneyAccountGeoEligible;

  const trackMoneyTabPressRef = useRef(null);

  const registerMoneyTabPressTracker = useCallback((fn) => {
    trackMoneyTabPressRef.current = fn;
  }, []);

  const accountsLength = useSelector(selectAccountsLength);

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
    money: {
      tabBarIconKey: TabBarIconKey.Money,
      callback: () => {
        trackMoneyTabPressRef.current?.();
      },
      rootScreenName: Routes.MONEY.HOME,
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
        // Re-enable AppState listener when returning to trending tab
        // (it was disabled when leaving to prevent phantom sessions)
        TrendingFeedSessionManager.getInstance().enableAppStateListener();
        // Start a new session when returning to trending tab
        // The session manager will ignore if a session is already active
        TrendingFeedSessionManager.getInstance().startSession('tab_press');
      },
      onLeave: () => {
        // End trending session when user switches to another tab
        TrendingFeedSessionManager.getInstance().endSession();
        // Disable AppState listener to prevent phantom sessions when app backgrounds/foregrounds
        // while user is on a different tab (since TrendingView stays mounted with unmountOnBlur: false)
        TrendingFeedSessionManager.getInstance().disableAppStateListener();
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

    // Hide tab bar when in browser
    const currentStackRouteName =
      currentRoute?.state?.routes?.[currentRoute?.state?.index]?.name;
    const isInBrowser =
      currentRoute.name?.startsWith(Routes.BROWSER.HOME) ||
      currentStackRouteName?.startsWith(Routes.BROWSER.HOME);
    if (isInBrowser) {
      return null;
    }

    // Hide tab bar when on rewards sub-pages (only show on home + onboarding)
    if (currentRoute.name === Routes.REWARDS_VIEW) {
      const rewardsHomeState = currentRoute?.state;
      const rewardsViewRoute = rewardsHomeState?.routes?.find(
        (r) => r.name === Routes.REWARDS_VIEW,
      );
      const rewardsNavState = rewardsViewRoute?.state;
      const activeRewardsRouteName =
        rewardsNavState?.routes?.[rewardsNavState?.index]?.name;
      const isRewardsHomePage =
        !activeRewardsRouteName ||
        activeRewardsRouteName === Routes.REWARDS_DASHBOARD ||
        activeRewardsRouteName === Routes.REWARDS_ONBOARDING_FLOW;
      if (!isRewardsHomePage) {
        return null;
      }
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
    /*
     * PredictPreviewSheetProvider is mounted here (above Tab.Navigator) so its
     * BottomSheet renders inside the full-viewport Home screen card.
     * BottomSheet uses `absolute inset-0` (see
     * @metamask/design-system-react-native) and would be clipped by an
     * individual tab's content area if mounted lower in the tree.
     *
     * A nested provider in PredictScreenStack still shadows this one for
     * usage; the registration stack in PredictPreviewSheetContext keeps only
     * the innermost (most recently mounted) provider active for state-based
     * Retry toasts so we don't double-fire when both are mounted.
     */
    <PredictPreviewSheetProvider>
      {isMoneyAccountEnabled ? (
        <MoneyTabPressTracker onRegister={registerMoneyTabPressTracker} />
      ) : null}
      <Tab.Navigator
        initialRouteName={Routes.WALLET.HOME}
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false }}
      >
        {/* Home Tab */}
        <Tab.Screen
          name={Routes.WALLET.HOME}
          options={options.home}
          component={WalletTabStackFlow}
        />

        {/* Explore Tab (w/ hidden browser) */}
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

        {/* Trade Tab */}
        <Tab.Screen
          name={Routes.MODAL.TRADE_WALLET_ACTIONS}
          options={options.trade}
          component={WalletTabStackFlow}
        />

        {/* Activity Tab (replaced by Money when feature flag is on and user is geo-eligible) */}
        {isMoneyAccountVisible ? (
          <Tab.Screen
            name={Routes.MONEY.ROOT}
            options={options.money}
            component={MoneyTabScreenStack}
          />
        ) : (
          <Tab.Screen
            name={Routes.TRANSACTIONS_VIEW}
            options={options.activity}
            component={TransactionsHome}
            layout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
          />
        )}

        {/* Rewards Tab */}
        <Tab.Screen
          name={Routes.REWARDS_VIEW}
          options={options.rewards}
          component={RewardsHome}
          layout={({ children }) => UnmountOnBlurComponent(children)}
        />
      </Tab.Navigator>
    </PredictPreviewSheetProvider>
  );
};

const Webview = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen name="SimpleWebview" component={SimpleWebview} />
  </NativeStack.Navigator>
);

/* eslint-disable react/prop-types */
const NftDetailsModeView = (props) => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name=" " // No name here because this title will be displayed in the header of the page
      component={NftDetails}
      initialParams={{
        collectible: props.route.params?.collectible,
      }}
    />
  </NativeStack.Navigator>
);

/* eslint-disable react/prop-types */
const NftDetailsFullImageModeView = (props) => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name=" " // No name here because this title will be displayed in the header of the page
      component={NftDetailsFullImage}
      initialParams={{
        collectible: props.route.params?.collectible,
      }}
    />
  </NativeStack.Navigator>
);

const AddBookmarkView = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen name="AddBookmark" component={AddBookmark} />
  </NativeStack.Navigator>
);

const OfflineModeView = () => (
  <NativeStack.Navigator>
    <NativeStack.Screen
      name="OfflineMode"
      component={OfflineMode}
      options={OfflineMode.navigationOptions}
    />
  </NativeStack.Navigator>
);

/* eslint-disable react/prop-types */
const NotificationsModeView = (props) => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name={Routes.NOTIFICATIONS.VIEW}
      component={NotificationsView}
    />
    <NativeStack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings}
    />
    <NativeStack.Screen
      name={Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}
      component={NotificationSettingsSection}
    />
    <NativeStack.Screen
      name={Routes.NOTIFICATIONS.DETAILS}
      component={NotificationsDetails}
    />
    <NativeStack.Screen name="ContactForm" component={ContactForm} />
  </NativeStack.Navigator>
);

const SetPasswordFlow = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen name="ChoosePassword" component={ChoosePassword} />
    <NativeStack.Screen
      name="AccountBackupStep1"
      component={AccountBackupStep1}
      options={{ gestureEnabled: false }}
    />
    <NativeStack.Screen
      name="AccountBackupStep1B"
      component={AccountBackupStep1B}
    />
    <NativeStack.Screen
      name="ManualBackupStep1"
      component={ManualBackupStep1}
    />
    <NativeStack.Screen
      name="ManualBackupStep2"
      component={ManualBackupStep2}
    />
    <NativeStack.Screen
      name="ManualBackupStep3"
      component={ManualBackupStep3}
    />
    <NativeStack.Screen name="OptinMetrics" component={OptinMetrics} />
  </NativeStack.Navigator>
);

///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
const SampleFeatureFlow = () => (
  <NativeStack.Navigator>
    <NativeStack.Screen
      name={Routes.SAMPLE_FEATURE}
      component={SampleFeature}
    />
  </NativeStack.Navigator>
);
///: END:ONLY_INCLUDE_IF

const MainNavigator = () => {
  const dispatch = useDispatch();
  // Announce to the saga layer (deeplink pipeline) that post-login screens
  // are now registered with React Navigation. Before this dispatch, a
  // `navigate('Wallet'|'RampTokenSelection'|...)` call would be silently
  // dropped because the target screen isn't in the navigation state yet.
  useEffect(() => {
    dispatch(mainNavigatorReady());
  }, [dispatch]);

  // Get feature flag state for conditional Money home screen registration
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  // Get feature flag state for conditional Perps screen registration
  const perpsEnabledFlag = useSelector(selectPerpsEnabledFlag);
  const isPerpsEnabled = useMemo(() => perpsEnabledFlag, [perpsEnabledFlag]);
  // Get feature flag state for conditional Predict screen registration
  const predictEnabledFlag = useSelector(selectPredictEnabledFlag);
  const isPredictEnabled = useMemo(
    () => predictEnabledFlag,
    [predictEnabledFlag],
  );
  // Get feature flag state for conditional Market Insights screen registration.
  // The screen must be registered when either the token or perps insights flag is
  // on — both entry points navigate to the same screen.
  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);
  const isMarketInsightsPerpsEnabled = useSelector(
    selectMarketInsightsPerpsEnabled,
  );
  const { colors } = useTheme();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );

  return (
    <NativeStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.default },
      }}
      initialRouteName={'Home'}
    >
      <NativeStack.Screen name="Home" component={HomeTabs} />
      {/*
       * Separate from the Rewards tab (REWARDS_VIEW → RewardsHome). RewardsNavigator
       * is its own native stack pushed onto the root native stack; nesting a native
       * stack inside another native stack is supported — the outer push uses the
       * root-stack transition, while screens inside RewardsNavigator animate natively.
       * Reach it with navigation.navigate(REWARDS_FLOW, { screen, params }).
       */}
      <NativeStack.Screen
        name={Routes.REWARDS_FLOW}
        component={RewardsNavigator}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL}
        component={RewardsBottomSheetModal}
        options={rewardsModalScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL}
        component={RewardsClaimBottomSheetModal}
        options={rewardsModalScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL}
        component={RewardOptInAccountGroupModal}
        options={rewardsModalScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET}
        component={EndOfSeasonClaimBottomSheet}
        options={rewardsModalScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.MODAL.REWARDS_SELECT_SHEET}
        component={RewardsSelectSheet}
        options={rewardsModalScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.DEPRECATED_NETWORK_DETAILS}
        component={DeprecatedNetworkDetails}
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: importedColors.transparent },
        }}
      />
      <NativeStack.Screen
        name={Routes.WALLET.TOKENS_FULL_VIEW}
        component={TokensFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.WALLET.DEFI_FULL_VIEW}
        component={DeFiFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.WALLET.CASH_TOKENS_FULL_VIEW}
        component={CashTokensFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.WALLET.WATCHLIST_FULL_VIEW}
        component={WatchlistFullScreenView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen name="AddAsset" component={AddAsset} />
      <NativeStack.Screen
        name="ConfirmAddAsset"
        component={ConfirmAddAsset}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS_VIEW}
        component={SettingsFlow}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name="Asset"
        component={AssetNavigator}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.ACTIVITY_DETAILS}
        component={ActivityDetails}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name={Routes.TRANSACTION_DETAILS}
        component={TransactionDetails}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="TrendingTokensFullView"
        component={TrendingTokensFullView}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name="RWATokensFullView"
        component={RWATokensFullView}
        options={slideFromRightNativeOptions}
      />

      <NativeStack.Screen name="Webview" component={Webview} />
      <NativeStack.Screen
        name="Send"
        component={Send}
        options={{
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.background.default },
          ...slideFromRightNativeOptions,
        }}
      />
      <NativeStack.Screen name="AddBookmarkView" component={AddBookmarkView} />
      <NativeStack.Screen name="OfflineModeView" component={OfflineModeView} />
      <NativeStack.Screen
        name={Routes.NOTIFICATIONS.VIEW}
        component={NotificationsModeView}
      />
      <NativeStack.Screen
        name={Routes.QR_TAB_SWITCHER}
        component={QRTabSwitcher}
      />
      <NativeStack.Screen
        name={Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE}
        component={VerificationCodeBottomSheet}
        options={addDeviceVerificationCodeScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.ADD_DEVICE_TO_WALLET}
        component={AddDeviceToWallet}
        options={{ headerShown: false }}
      />
      <NativeStack.Screen
        name="NftDetails"
        component={NftDetailsModeView}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name="NftDetailsFullImage"
        component={NftDetailsFullImageModeView}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.WALLET.NFTS_FULL_VIEW}
        component={NftFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.REWARD_BENEFIT_FULL_VIEW}
        component={BenefitFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.REWARD_BENEFITS_FULL_VIEW}
        component={BenefitsFullView}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={TokenListRoutes}
      />
      <NativeStack.Screen
        name={Routes.RAMP.HEADLESS_ENTRY}
        component={TokenListRoutes}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
      <NativeStack.Screen
        name={Routes.RAMP.BUY}
        options={{
          contentStyle: { backgroundColor: colors.background.default },
        }}
      >
        {() => <RampRoutes rampType={RampType.BUY} />}
      </NativeStack.Screen>
      <NativeStack.Screen
        name={Routes.RAMP.SELL}
        options={{
          contentStyle: { backgroundColor: colors.background.default },
        }}
      >
        {() => <RampRoutes rampType={RampType.SELL} />}
      </NativeStack.Screen>
      <NativeStack.Screen
        name={Routes.BRIDGE.ROOT}
        component={BridgeScreenStack}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.BRIDGE.MODALS.ROOT}
        component={BridgeModalStack}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
      <NativeStack.Screen
        name="StakeScreens"
        component={StakeScreenStack}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.EARN.ROOT}
        component={EarnScreenStack}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      <NativeStack.Screen
        name={Routes.EARN.MODALS.ROOT}
        component={EarnModalStack}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
      {isMoneyAccountEnabled && (
        <>
          <NativeStack.Screen
            name={Routes.MONEY.ROOT}
            component={MoneyTabScreenStack}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.CONFIRMATIONS_ROOT}
            component={MoneyConfirmationScreenStack}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.ONBOARDING}
            component={MoneyOnboardingView}
            options={{ headerShown: false, ...fadeNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.FIRST_TIME_DEPOSIT}
            component={MoneyFirstTimeDepositView}
            options={{
              ...clearNativeStackNavigatorOptions,
              ...transparentModalScreenOptions,
              gestureEnabled: false,
            }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.POTENTIAL_EARNINGS}
            component={MoneyPotentialEarningsView}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.MODALS.ROOT}
            component={MoneyModalStack}
            options={{
              ...clearNativeStackNavigatorOptions,
              ...transparentModalScreenOptions,
            }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.TRANSACTION_DETAILS}
            component={TransactionDetails}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.CARD_TRANSACTION_DETAILS}
            component={MoneyApiActivityDetailsView}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.TRANSACTIONS_VIEW}
            component={TransactionsHome}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
        </>
      )}
      {/*
       * Rendered outside isMoneyAccountEnabled so we can display modal when feature is disabled.
       * - Maintenance modal when the feature is disabled.
       * - Gradual rollout modal when the user is not part of the gradual rollout cohort yet but feature is enabled.
       */}
      <NativeStack.Screen
        name={Routes.MONEY.MODALS.DEEPLINK_MODAL}
        component={MoneyDeeplinkModal}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
      <NativeStack.Screen
        name="StakeModals"
        component={StakeModalStack}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
      {isPerpsEnabled && (
        <>
          <NativeStack.Screen
            name={Routes.PERPS.ROOT}
            component={PerpsScreenStack}
            options={{
              headerShown: false,
              ...slideFromRightNativeOptions,
            }}
          />
          <NativeStack.Screen
            name={Routes.PERPS.TUTORIAL}
            component={PerpsTutorialCarousel}
            options={{
              headerShown: false,
            }}
          />
          <NativeStack.Screen
            name={Routes.PERPS.MODALS.ROOT}
            component={PerpsModalStackWithErrorGate}
            options={{
              ...clearNativeStackNavigatorOptions,
              ...transparentModalScreenOptions,
            }}
          />
        </>
      )}
      {isPerpsEnabled && (
        <>
          <NativeStack.Screen
            name={Routes.PERPS.POSITION_TRANSACTION}
            component={PerpsPositionTransactionView}
            options={{
              title: 'Position Transaction',
              headerShown: true,
            }}
          />
          <NativeStack.Screen
            name={Routes.PERPS.ORDER_TRANSACTION}
            component={PerpsOrderTransactionView}
            options={{
              title: 'Order Transaction',
              headerShown: true,
            }}
          />
          <NativeStack.Screen
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
          <NativeStack.Screen
            name={Routes.PREDICT.ROOT}
            component={PredictScreenStack}
            options={slideFromRightNativeOptions}
          />
          <NativeStack.Screen
            name={Routes.PREDICT.MODALS.ROOT}
            component={PredictModalStack}
            options={{
              ...clearNativeStackNavigatorOptions,
              ...transparentModalScreenOptions,
            }}
          />
        </>
      )}
      {(isMarketInsightsEnabled || isMarketInsightsPerpsEnabled) && (
        <NativeStack.Screen
          name={Routes.MARKET_INSIGHTS.VIEW}
          component={MarketInsightsView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      )}
      {isSocialLeaderboardEnabled && (
        <NativeStack.Screen
          name={Routes.SOCIAL_LEADERBOARD.VIEW}
          component={SocialTradersView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      )}
      {isSocialLeaderboardEnabled && (
        <NativeStack.Screen
          name={Routes.SOCIAL_LEADERBOARD.PROFILE}
          component={TraderProfileView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      )}
      {isSocialLeaderboardEnabled && (
        <NativeStack.Screen
          name={Routes.SOCIAL_LEADERBOARD.POSITION}
          component={TraderPositionView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      )}
      {isSocialLeaderboardEnabled && (
        <NativeStack.Screen
          name={Routes.SOCIAL_LEADERBOARD.ONBOARDING}
          component={SocialLeaderboardOnboarding}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      )}
      {isSocialLeaderboardEnabled && (
        <NativeStack.Screen
          name={Routes.SOCIAL_LEADERBOARD.TRADING_SIGNALS_SETUP}
          component={TradingSignalsSetupBottomSheet}
          options={{
            ...clearNativeStackNavigatorOptions,
            ...transparentModalScreenOptions,
          }}
        />
      )}
      <>
        <NativeStack.Screen
          name={Routes.EXPLORE_SEARCH}
          component={ExploreSearchScreen}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
        <NativeStack.Screen
          name={Routes.SITES_FULL_VIEW}
          component={SitesFullView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
        <NativeStack.Screen
          name={Routes.WHATS_HAPPENING_DETAIL}
          component={WhatsHappeningDetailView}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
        <NativeStack.Screen
          name={Routes.BROWSER.HOME}
          component={BrowserFlow}
          options={{ headerShown: false, ...slideFromRightNativeOptions }}
        />
      </>
      <NativeStack.Screen
        name="SetPasswordFlow"
        component={SetPasswordFlow}
        options={{
          headerShown: false,
          headerTitle: () => (
            <Image
              style={styles.headerLogo}
              source={require('../../../images/branding/metamask-name.png')}
              resizeMode={'contain'}
            />
          ),
        }}
      />
      {/* TODO: This is added to support slide 4 in the carousel - once changed this can be safely removed*/}
      <NativeStack.Screen
        name="GeneralSettings"
        component={GeneralSettings}
        options={{ headerShown: false }}
      />
      {process.env.METAMASK_ENVIRONMENT !== 'production' && (
        <NativeStack.Screen
          name={Routes.FEATURE_FLAG_OVERRIDE}
          component={FeatureFlagOverride}
          options={{ headerShown: false }}
        />
      )}
      <NativeStack.Screen
        name="DeFiProtocolPositionDetails"
        component={DeFiProtocolPositionDetails}
        options={{ headerShown: false, ...slideFromRightNativeOptions }}
      />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      }
      <NativeStack.Screen
        name={Routes.SAMPLE_FEATURE}
        component={SampleFeatureFlow}
      />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      <NativeStack.Screen
        name={Routes.CARD.ROOT}
        component={CardRoutes}
        options={({ route }) => ({
          ...fullScreenModalSlideFromBottomNativeOptions,
          animation: route.params?.animation ?? 'slide_from_right',
        })}
      />
      <NativeStack.Screen
        name={Routes.RAMP.MODALS.PROCESSING_INFO}
        component={ProcessingInfoModal}
        options={{
          ...clearNativeStackNavigatorOptions,
          ...transparentModalScreenOptions,
        }}
      />
    </NativeStack.Navigator>
  );
};

export default MainNavigator;
