import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Keyboard, Platform } from 'react-native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { mainNavigatorReady } from '../../../actions/navigation';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import Browser from '../../Views/Browser';
import AddBookmark from '../../Views/AddBookmark';
import SimpleWebview from '../../Views/SimpleWebview';
import AccountsMenu from '../../Views/AccountsMenu';
import AccountHub from '../../Views/AccountHub';
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
import ActivityScreen from '../../Views/ActivityScreen';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import useRewardsVersionGuard from '../../UI/Rewards/hooks/useRewardsVersionGuard';
import { useCandidateSubscriptionId } from '../../UI/Rewards/hooks/useCandidateSubscriptionId';
import { useRewardsTabPerformance } from '../../UI/Rewards/hooks/useRewardsTabPerformance';
import RewardsUpdateRequired from '../../UI/Rewards/components/RewardsUpdateRequired/RewardsUpdateRequired';
import RewardsNavigator from '../../UI/Rewards/RewardsNavigator';
import RewardsDashboard from '../../UI/Rewards/Views/RewardsDashboard';
import RewardsOnboardingNavigator from '../../UI/Rewards/OnboardingNavigator';
import { ExploreFeed } from '../../Views/TrendingView/TrendingView';
import WhatsHappeningDetailView from '../../Views/WhatsHappeningDetailView';
import ExploreSearchScreen from '../../Views/TrendingView/Views/ExploreSearchScreen/ExploreSearchScreen';
import OptinMetrics from '../../UI/OptinMetrics';

import RampRoutes from '../../UI/Ramp/Aggregator/routes';
import { RampType } from '../../UI/Ramp/Aggregator/types';
import RampSettings from '../../UI/Ramp/Aggregator/Views/Settings';
import RampActivationKeyForm from '../../UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm';
import RampHeadlessPlayground from '../../UI/Ramp/Views/HeadlessPlayground';
import TokenListRoutes from '../../UI/Ramp/routes';

import V2BankDetails from '../../UI/Ramp/Views/NativeFlow/BankDetails';
import CreateVirtualBankAccount from '../../UI/Ramp/Views/VirtualBankAccount/CreateVirtualBankAccount';
import VbaVerifyIdentity from '../../UI/Ramp/Views/VirtualBankAccount/VerifyIdentity';
import KycEmail from '../../UI/Ramp/Views/VirtualBankAccount/KycEmail';

import { colors as importedColors } from '../../../styles/common';
import OrderDetails from '../../UI/Ramp/Aggregator/Views/OrderDetails';
import RampsOrderDetails from '../../UI/Ramp/Views/OrderDetails';
import DepositOrderDetails from '../../UI/Ramp/Views/OrderDetails/DepositOrderDetails/DepositOrderDetails';
import ProcessingInfoModal from '../../UI/Ramp/Views/Modals/ProcessingInfoModal/ProcessingInfoModal';
import SendTransaction from '../../UI/Ramp/Aggregator/Views/SendTransaction';
import TabBar from '../../../component-library/components/Navigation/TabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabBarFloating, {
  FloatingTabBarInsetContext,
} from '../../../component-library/components/Navigation/TabBarFloating';
import { TAB_BAR_FLOATING_HEIGHT } from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import { getTabBarFloatingBottomPadding } from '../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import {
  HEADER_NAV_BAR_AB_KEY,
  HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS,
  HEADER_NAV_BAR_VARIANTS,
} from '../../Views/Homepage/abTestConfig';
import {
  SOCIAL_V1_AB_KEY,
  SOCIAL_V1_VARIANTS,
} from '../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import { useABTest } from '../../../hooks';
import { useHomeTabDefinitions } from './HomeTabs/useHomeTabDefinitions';
import { useNativeSystemSlotTab } from './HomeTabs/useNativeSystemSlotTab';
import { useIsNativeTabBar } from './HomeTabs/useIsNativeTabBar';
import {
  TAB_BAR_VISIBLE_STYLE,
  toJsTabOptions,
  toNativeTabOptions,
} from './HomeTabs/homeTabs.mappers';
import type {
  HomeTabDefinition,
  HomeTabKey,
  HomeTabRoute,
} from './HomeTabs/homeTabs.types';
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
  addDeviceVerificationCodeScreenOptions,
  transparentModalStackOptions,
  slideFromRightNativeOptions,
  fadeNativeOptions,
  fullScreenModalSlideFromBottomNativeOptions,
} from '../../../constants/navigation/clearStackNavigatorOptions';
import {
  TabBarIconKey,
  type ExtendedBottomTabNavigationOptions,
  type TabBarProps,
} from '../../../component-library/components/Navigation/TabBar/TabBar.types';
import SDKSessionsManager from '../../Views/SDK/SDKSessionsManager/SDKSessionsManager';
import { useTheme } from '../../../util/theme';
import DeprecatedNetworkDetails from '../../UI/DeprecatedNetworkModal';
import ConfirmAddAsset from '../../Views/AddAsset/Views/ConfirmAddTokenView/ConfirmAddAsset';
import { AesCryptoTestForm } from '../../Views/AesCryptoTestForm';
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
import { selectIsMoneyAccountVisible } from '../../UI/Money/selectors/visibility';
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
import { TrendingQuickBuySheetProvider } from '../../UI/Trending/contexts';
import {
  MarketInsightsView,
  selectMarketInsightsEnabled,
} from '../../UI/MarketInsights';
import { selectMarketInsightsPerpsEnabled } from '../../../selectors/featureFlagController/marketInsights';
import {
  SocialV0View,
  SocialV1View,
  SocialPostComposerView,
  MyProfileView,
  FollowConnectionsView,
  ProfilesToFollowView,
  ManageProfileView,
  ManageProfileTextEditorView,
  ManageProfileTradingActivityView,
  ManageProfileLinkedAccountView,
  TraderProfileView,
  TraderPositionView,
  SocialLeaderboardOnboarding,
  SocialProfileOnboardingView,
  TradingSignalsSetupBottomSheet,
} from '../../Views/SocialLeaderboard';
import { selectSocialLeaderboardEnabled } from '../../../selectors/featureFlagController/socialLeaderboard';
import PerpsPositionTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsPositionTransactionView';
import PerpsOrderTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsOrderTransactionView';
import PerpsFundingTransactionView from '../../UI/Perps/Views/PerpsTransactionsView/PerpsFundingTransactionView';
import DeFiProtocolPositionDetails from '../../UI/DeFiPositions/DeFiProtocolPositionDetails';
import { withUnmountOnTabBlur } from '../../Views/UnmountOnBlur/UnmountOnTabBlur';
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
import RewardsInfoSheetModal from '../../UI/Rewards/components/RewardsInfoSheetModal';
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
import { withRouteMessenger } from '../../../messengers/helpers/route-messenger-helpers';
import { ALLOWED_CAPABILITIES as WALLET_ROUTE_ALLOWED_CAPABILITIES } from '../../Views/Wallet/messenger';
import { ALLOWED_CAPABILITIES as ADD_DEVICE_TO_WALLET_ROUTE_ALLOWED_CAPABILITIES } from '../../Views/AddDeviceToWallet/messenger';
import { ALLOWED_CAPABILITIES as CHOOSE_PASSWORD_ROUTE_ALLOWED_CAPABILITIES } from '../../Views/ChoosePassword/messenger';
import { ALLOWED_CAPABILITIES as QR_TAB_SWITCHER_ROUTE_ALLOWED_CAPABILITIES } from '../../Views/QRTabSwitcher/messenger';
import MoneyDeeplinkModal from '../../UI/Money/components/MoneyDeeplinkModal/MoneyDeeplinkModal';

const NativeStack = createNativeStackNavigator();
const JsTab = createBottomTabNavigator();
const NativeTab = createNativeBottomTabNavigator();
const SOCIAL_V1_ASSIGNMENT_OPTIONS = { trackExposure: false };

const WalletWithMessenger = withRouteMessenger(Wallet, {
  capabilities: WALLET_ROUTE_ALLOWED_CAPABILITIES,
});

const AddDeviceToWalletWithMessenger = withRouteMessenger(AddDeviceToWallet, {
  capabilities: ADD_DEVICE_TO_WALLET_ROUTE_ALLOWED_CAPABILITIES,
});

const ChoosePasswordWithMessenger = withRouteMessenger(ChoosePassword, {
  capabilities: CHOOSE_PASSWORD_ROUTE_ALLOWED_CAPABILITIES,
});

const QRTabSwitcherWithMessenger = withRouteMessenger(QRTabSwitcher, {
  capabilities: QR_TAB_SWITCHER_ROUTE_ALLOWED_CAPABILITIES,
});

// Shared defaults for every native stack in this file: no native header (each
// screen draws its own) on a themed background so pushed screens do not flash
// the system default.
const useDefaultStackScreenOptions = (): NativeStackNavigationOptions => {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.background.default },
    }),
    [colors.background.default],
  );
};

/**
 * A stack host that forwards its own route params down to the first screen of
 * the stack it renders. The navigators in this file are untyped
 * (`ParamListBase`), so those params arrive as `object | undefined`.
 */
interface ForwardedParamsHostProps {
  route: RouteProp<ParamListBase, string>;
}

/** `Routes.CARD.ROOT` takes an animation override beside its nested params. */
interface CardRootRouteParams {
  animation?: NativeStackNavigationOptions['animation'];
}

/**
 * Cast target for screens that declare their own `route.params` shape. The
 * navigators here are untyped (`ParamListBase`), so `Screen` expects a
 * component whose `route.params` is `object | undefined` — a component asking
 * for concrete params is not assignable to that. Every screen cast this way
 * takes only `route` and `navigation`, both of which React Navigation supplies,
 * so the cast drops the params type and nothing else. Registering these against
 * a typed param list would remove the need for it.
 */
type ScreenComponent = React.ComponentType;

const AssetStackFlow = (props: ForwardedParamsHostProps) => (
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

const WalletTabStackFlow = () => {
  const defaultScreenOptions = useDefaultStackScreenOptions();
  return (
    <NativeStack.Navigator
      initialRouteName={'WalletView'}
      screenOptions={defaultScreenOptions}
    >
      <NativeStack.Screen
        name="WalletView"
        component={WalletWithMessenger}
        options={{ animation: 'none' }}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={RevealPrivateCredential}
      />
    </NativeStack.Navigator>
  );
};

const TransactionsHome = () => {
  const defaultScreenOptions = useDefaultStackScreenOptions();
  return (
    <NativeStack.Navigator screenOptions={defaultScreenOptions}>
      <NativeStack.Screen
        name={Routes.TRANSACTIONS_VIEW}
        component={ActivityScreen}
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
        component={BridgeTransactionDetails as ScreenComponent}
      />
    </NativeStack.Navigator>
  );
};

const RewardsHome = () => {
  const defaultScreenOptions = useDefaultStackScreenOptions();
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
  // Tab time-to-content: tap Rewards → onboarding content or dashboard shell.
  useRewardsTabPerformance({ isVersionBlocked });

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
      screenOptions={{ ...defaultScreenOptions, animation: 'none' }}
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

const BrowserFlow = (props: ForwardedParamsHostProps) => {
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
        component={AssetLoader as ScreenComponent}
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

///: BEGIN:ONLY_INCLUDE_IF(snaps)
const SnapSettingsWithMessenger = withRouteMessenger(SnapSettings, {
  capabilities: SNAPS_SETTINGS_ROUTE_ALLOWED_CAPABILITIES,
});

const SnapsSettingsStack = () => {
  const defaultScreenOptions = useDefaultStackScreenOptions();
  return (
    <NativeStack.Navigator screenOptions={defaultScreenOptions}>
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
  const defaultScreenOptions = useDefaultStackScreenOptions();
  return (
    <NativeStack.Navigator
      initialRouteName={Routes.ACCOUNTS_MENU_VIEW}
      screenOptions={defaultScreenOptions}
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
        component={NotificationsSettings as ScreenComponent}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}
        component={NotificationSettingsSection as ScreenComponent}
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
      {CAN_INSTALL_THIRD_PARTY_SNAPS ? (
        <NativeStack.Screen
          name={Routes.SNAPS.SNAPS_SETTINGS_LIST}
          component={SnapsSettingsStack}
        />
      ) : null}
      {
        ///: END:ONLY_INCLUDE_IF
      }
    </NativeStack.Navigator>
  );
};

// Replaces `unmountOnBlur` (removed in React Navigation v7).
const BrowserFlowUnmountOnTabBlur = withUnmountOnTabBlur(BrowserFlow);
const TransactionsHomeUnmountOnTabBlur = withUnmountOnTabBlur(TransactionsHome);
const RewardsHomeUnmountOnTabBlur = withUnmountOnTabBlur(RewardsHome);

// `satisfies` keeps each component's own type for `JsTab.Screen` while still
// requiring an entry for every tab key.
const HOME_TAB_COMPONENTS = {
  home: WalletTabStackFlow,
  explore: ExploreFeed,
  browser: BrowserFlowUnmountOnTabBlur,
  activity: TransactionsHomeUnmountOnTabBlur,
  money: MoneyTabScreenStack,
  rewards: RewardsHomeUnmountOnTabBlur,
  social: SocialV0View,
} satisfies Record<HomeTabKey, unknown>;

const HomeTabs = () => {
  const { colors } = useTheme();
  const [isKeyboardHidden, setIsKeyboardHidden] = useState(true);

  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);

  const { variant: headerNavBarVariant } = useABTest(
    HEADER_NAV_BAR_AB_KEY,
    HEADER_NAV_BAR_VARIANTS,
    HEADER_NAV_BAR_AB_TEST_EXPOSURE_OPTIONS,
  );
  const isFloatingTabBar = headerNavBarVariant.isCompactHeaderEnabled;
  // The floating bar only renders on the compact arms, and neither of those
  // uses `none`. Undefined keeps `TabBarFloating`'s own `search` default.
  const trailingNavBarAction =
    headerNavBarVariant.trailingNavBarAction === 'none'
      ? undefined
      : headerNavBarVariant.trailingNavBarAction;
  const isNativeTabBar = useIsNativeTabBar();
  const safeAreaInsets = useSafeAreaInsets();
  const nativeTabBarInset =
    getTabBarFloatingBottomPadding(safeAreaInsets.bottom) +
    TAB_BAR_FLOATING_HEIGHT;
  const [floatingTabBarHeight, setFloatingTabBarHeight] = useState(0);
  const isSocialTabEnabled = useSelector(selectSocialLeaderboardEnabled);

  const showSocialTab = isFloatingTabBar && isSocialTabEnabled;

  const trackMoneyTabPressRef = useRef<(() => void) | null>(null);

  const registerMoneyTabPressTracker = useCallback(
    (fn: (() => void) | null) => {
      trackMoneyTabPressRef.current = fn;
    },
    [],
  );
  const trackMoneyTabPress = useCallback(() => {
    trackMoneyTabPressRef.current?.();
  }, []);

  const { tabs, trackBottomNavPress, getNativeTabListeners } =
    useHomeTabDefinitions({
      isMoneyAccountVisible,
      showSocialTab,
      trackMoneyTabPress,
    });
  const systemSlotTab = useNativeSystemSlotTab(
    headerNavBarVariant.trailingNavBarAction,
  );

  // Control only: a modal trigger the bar handles itself.
  const tradeOptions: ExtendedBottomTabNavigationOptions = {
    tabBarIconKey: TabBarIconKey.Trade,
    rootScreenName: Routes.MODAL.TRADE_WALLET_ACTIONS,
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

  const renderTabBar = ({
    state,
    descriptors,
    navigation,
  }: BottomTabBarProps) => {
    const currentRoute = state.routes[state.index];

    // Hide tab bar when in browser
    const nestedState = currentRoute?.state;
    const currentStackRouteName =
      nestedState?.index === undefined
        ? undefined
        : nestedState.routes[nestedState.index]?.name;
    const isInBrowser =
      currentRoute.name?.startsWith(Routes.BROWSER.HOME) ||
      currentStackRouteName?.startsWith(Routes.BROWSER.HOME);
    if (isInBrowser) {
      return null;
    }

    const currentTab = tabs.find((tab) => tab.name === currentRoute.name);
    if (currentTab?.hidesTabBarFor?.(currentRoute)) {
      return null;
    }

    if (isKeyboardHidden) {
      // Screens here are registered with `ExtendedBottomTabNavigationOptions`
      // (see `toJsTabOptions`), which the navigator still types as the base
      // bottom-tab options.
      const extendedDescriptors =
        descriptors as unknown as TabBarProps['descriptors'];

      return isFloatingTabBar ? (
        <TabBarFloating
          state={state}
          descriptors={extendedDescriptors}
          navigation={navigation}
          onHeightChange={setFloatingTabBarHeight}
          trailingAction={trailingNavBarAction}
        />
      ) : (
        <TabBar
          state={state}
          descriptors={extendedDescriptors}
          navigation={navigation}
        />
      );
    }
    return null;
  };

  const renderJsTabScreen = (tab: HomeTabDefinition) => (
    <JsTab.Screen
      key={tab.name}
      name={tab.name}
      options={toJsTabOptions(
        tab,
        // `TabBar` fires the Navigation Drawer event itself.
        isFloatingTabBar ? { trackBottomNavPress } : undefined,
      )}
      component={HOME_TAB_COMPONENTS[tab.key]}
    />
  );

  const renderNativeTabScreen = (tab: HomeTabDefinition) => (
    <NativeTab.Screen
      key={tab.name}
      name={tab.name}
      options={
        tab.hidesTabBarFor
          ? ({ route }: { route: HomeTabRoute }) =>
              toNativeTabOptions(tab, route)
          : toNativeTabOptions(tab)
      }
      listeners={getNativeTabListeners(tab)}
      component={HOME_TAB_COMPONENTS[tab.key]}
    />
  );

  /*
   * PredictPreviewSheetProvider and TrendingQuickBuySheetProvider are
   * mounted here (above Tab.Navigator) so their BottomSheets render inside
   * the full-viewport Home screen card.
   * BottomSheet uses `absolute inset-0` (see
   * @metamask/design-system-react-native) and would be clipped by an
   * individual tab's content area if mounted lower in the tree.
   *
   * A nested provider in PredictScreenStack still shadows this one for
   * usage; the registration stack in PredictPreviewSheetContext keeps only
   * the innermost (most recently mounted) provider active for state-based
   * Retry toasts so we don't double-fire when both are mounted.
   */
  if (isNativeTabBar) {
    return (
      <PredictPreviewSheetProvider>
        <TrendingQuickBuySheetProvider>
          {isMoneyAccountEnabled ? (
            <MoneyTabPressTracker onRegister={registerMoneyTabPressTracker} />
          ) : null}
          <FloatingTabBarInsetContext.Provider value={nativeTabBarInset}>
            <NativeTab.Navigator
              initialRouteName={Routes.WALLET.HOME}
              screenOptions={{
                headerShown: false,
                // Mount on first visit like the JS navigator; the native
                // default renders every tab at launch and never freezes them.
                lazy: true,
                // UIKit picks the inactive colour.
                tabBarActiveTintColor: colors.icon.default,
                tabBarMinimizeBehavior: 'onScrollDown',
                tabBarStyle: TAB_BAR_VISIBLE_STYLE,
                overrideScrollViewContentInsetAdjustmentBehavior: false,
              }}
            >
              {tabs.filter((tab) => !tab.isHidden).map(renderNativeTabScreen)}
              <NativeTab.Screen
                name={systemSlotTab.name}
                options={systemSlotTab.options}
                listeners={systemSlotTab.listeners}
                component={systemSlotTab.component}
              />
            </NativeTab.Navigator>
          </FloatingTabBarInsetContext.Provider>
        </TrendingQuickBuySheetProvider>
      </PredictPreviewSheetProvider>
    );
  }

  return (
    <PredictPreviewSheetProvider>
      <TrendingQuickBuySheetProvider>
        {isMoneyAccountEnabled ? (
          <MoneyTabPressTracker onRegister={registerMoneyTabPressTracker} />
        ) : null}
        <FloatingTabBarInsetContext.Provider value={floatingTabBarHeight}>
          <JsTab.Navigator
            initialRouteName={Routes.WALLET.HOME}
            tabBar={renderTabBar}
            screenOptions={{
              headerShown: false,
              // Never suspend blurred tabs: react-native-screens' delayed freeze
              // can drop the activityState commit when a tab is left mid-mount,
              // leaving the old screen (usually Money) stuck on top.
              freezeOnBlur: false,
            }}
          >
            {tabs.slice(0, 3).map(renderJsTabScreen)}

            {isFloatingTabBar ? null : (
              <JsTab.Screen
                name={Routes.MODAL.TRADE_WALLET_ACTIONS}
                options={tradeOptions}
                component={WalletTabStackFlow}
              />
            )}

            {tabs.slice(3).map(renderJsTabScreen)}
          </JsTab.Navigator>
        </FloatingTabBarInsetContext.Provider>
      </TrendingQuickBuySheetProvider>
    </PredictPreviewSheetProvider>
  );
};

const Webview = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen name="SimpleWebview" component={SimpleWebview} />
  </NativeStack.Navigator>
);

const NotificationsModeView = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name={Routes.NOTIFICATIONS.VIEW}
      component={NotificationsView}
    />
    <NativeStack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}
      component={NotificationSettingsSection as ScreenComponent}
    />
    <NativeStack.Screen
      name={Routes.NOTIFICATIONS.DETAILS}
      component={NotificationsDetails as ScreenComponent}
    />
    <NativeStack.Screen name="ContactForm" component={ContactForm} />
  </NativeStack.Navigator>
);

const SetPasswordFlow = () => (
  <NativeStack.Navigator screenOptions={{ headerShown: false }}>
    <NativeStack.Screen
      name="ChoosePassword"
      component={ChoosePasswordWithMessenger}
    />
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
  const defaultScreenOptions = useDefaultStackScreenOptions();
  const isSocialLeaderboardEnabled = useSelector(
    selectSocialLeaderboardEnabled,
  );
  const { variant: socialV1Variant } = useABTest(
    SOCIAL_V1_AB_KEY,
    SOCIAL_V1_VARIANTS,
    SOCIAL_V1_ASSIGNMENT_OPTIONS,
  );
  const isSocialV1Enabled =
    isSocialLeaderboardEnabled && socialV1Variant.useSocialV1;
  return (
    <NativeStack.Navigator
      screenOptions={defaultScreenOptions}
      initialRouteName={'Home'}
    >
      <NativeStack.Screen name="Home" component={HomeTabs} />
      {/*
       * Fallback home for Rewards. Treatment gives the tab slot to Social, so
       * `navigate(REWARDS_VIEW)` from the header has no tab to land on and
       * bubbles up to here. Control registers the tab too, and the tab
       * navigator is nearer to the caller, so it wins and this is never
       * reached. Registered unconditionally so the route always resolves
       * regardless of how the arms are configured.
       */}
      <NativeStack.Screen name={Routes.REWARDS_VIEW} component={RewardsHome} />
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
      />
      {/*
       * Rewards sheets are registered on the root MainNavigator so they are
       * reachable from both the Rewards tab (dashboard/onboarding) and
       * REWARDS_FLOW sub-pages. transparentModalStackOptions carries
       * animation: 'none' so only the BottomSheet's internal slide runs —
       * without it the native stack slides the entire screen (overlay
       * included) from the bottom.
       */}
      <NativeStack.Group screenOptions={transparentModalStackOptions}>
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL}
          component={RewardsBottomSheetModal as ScreenComponent}
        />
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_INFO_SHEET_MODAL}
          component={RewardsInfoSheetModal as ScreenComponent}
        />
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL}
          component={RewardsClaimBottomSheetModal as ScreenComponent}
        />
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL}
          component={RewardOptInAccountGroupModal}
        />
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET}
          component={EndOfSeasonClaimBottomSheet as ScreenComponent}
        />
        <NativeStack.Screen
          name={Routes.MODAL.REWARDS_SELECT_SHEET}
          component={RewardsSelectSheet as ScreenComponent}
        />
      </NativeStack.Group>
      <NativeStack.Screen
        name={Routes.DEPRECATED_NETWORK_DETAILS}
        component={DeprecatedNetworkDetails}
        options={{
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: importedColors.transparent },
        }}
      />
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen
          name={Routes.WALLET.TOKENS_FULL_VIEW}
          component={TokensFullView}
        />
        <NativeStack.Screen
          name={Routes.WALLET.DEFI_FULL_VIEW}
          component={DeFiFullView}
        />
        <NativeStack.Screen
          name={Routes.WALLET.CASH_TOKENS_FULL_VIEW}
          component={CashTokensFullView}
        />
        <NativeStack.Screen
          name={Routes.WALLET.WATCHLIST_FULL_VIEW}
          component={WatchlistFullScreenView}
        />
      </NativeStack.Group>
      <NativeStack.Screen name="AddAsset" component={AddAsset} />
      <NativeStack.Screen
        name="ConfirmAddAsset"
        component={ConfirmAddAsset}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.SETTINGS_VIEW}
        component={SettingsFlow}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.ACCOUNT_HUB_VIEW}
        component={AccountHub}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name="Asset"
        component={AssetStackFlow}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.ACTIVITY_DETAILS}
        component={ActivityDetails}
      />
      <NativeStack.Screen
        name={Routes.TRANSACTION_DETAILS}
        component={TransactionDetails}
      />
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen
          name={Routes.WALLET.TRENDING_TOKENS_FULL_VIEW}
          component={TrendingTokensFullView}
        />
        <NativeStack.Screen
          name={Routes.WALLET.RWA_TOKENS_FULL_VIEW}
          component={RWATokensFullView}
        />
      </NativeStack.Group>

      <NativeStack.Screen name="Webview" component={Webview} />
      <NativeStack.Screen
        name="Send"
        component={Send}
        options={{
          gestureEnabled: false,
          ...slideFromRightNativeOptions,
        }}
      />
      <NativeStack.Screen name="AddBookmarkView" component={AddBookmark} />
      <NativeStack.Screen
        name="OfflineModeView"
        component={OfflineMode}
        options={OfflineMode.navigationOptions}
      />
      <NativeStack.Screen
        name={Routes.NOTIFICATIONS.VIEW}
        component={NotificationsModeView}
      />
      <NativeStack.Screen
        name={Routes.QR_TAB_SWITCHER}
        component={QRTabSwitcherWithMessenger}
      />
      <NativeStack.Screen
        name={Routes.SHEET.ADD_DEVICE_VERIFICATION_CODE}
        component={VerificationCodeBottomSheet}
        options={addDeviceVerificationCodeScreenOptions}
      />
      <NativeStack.Screen
        name={Routes.ONBOARDING.ADD_DEVICE_TO_WALLET}
        component={AddDeviceToWalletWithMessenger}
      />
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen name="NftDetails" component={NftDetails} />
        <NativeStack.Screen
          name="NftDetailsFullImage"
          component={NftDetailsFullImage}
        />
        <NativeStack.Screen
          name={Routes.WALLET.NFTS_FULL_VIEW}
          component={NftFullView}
        />
      </NativeStack.Group>
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen
          name={Routes.REWARD_BENEFIT_FULL_VIEW}
          component={BenefitFullView}
        />
        <NativeStack.Screen
          name={Routes.REWARD_BENEFITS_FULL_VIEW}
          component={BenefitsFullView}
        />
      </NativeStack.Group>
      <NativeStack.Screen
        name={Routes.RAMP.TOKEN_SELECTION}
        component={TokenListRoutes}
      />
      <NativeStack.Screen
        name={Routes.RAMP.HEADLESS_ENTRY}
        component={TokenListRoutes}
        options={transparentModalStackOptions}
      />
      <NativeStack.Screen name={Routes.RAMP.BUY}>
        {() => <RampRoutes rampType={RampType.BUY} />}
      </NativeStack.Screen>
      <NativeStack.Screen name={Routes.RAMP.SELL}>
        {() => <RampRoutes rampType={RampType.SELL} />}
      </NativeStack.Screen>
      {/* Virtual Bank Account (Brazil neobank MVP) flow — Iron KYC, not Transak. */}
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen
          name={Routes.RAMP.VBA_KYC_EMAIL}
          component={KycEmail}
        />
        <NativeStack.Screen
          name={Routes.RAMP.CREATE_VIRTUAL_BANK_ACCOUNT}
          component={CreateVirtualBankAccount}
        />
        <NativeStack.Screen
          name={Routes.RAMP.VBA_VERIFY_IDENTITY}
          component={VbaVerifyIdentity}
        />
      </NativeStack.Group>
      <NativeStack.Screen
        name={Routes.BRIDGE.ROOT}
        component={BridgeScreenStack}
        options={{ ...slideFromRightNativeOptions, gestureEnabled: false }}
      />
      <NativeStack.Screen
        name={Routes.BRIDGE.MODALS.ROOT}
        component={BridgeModalStack}
        options={transparentModalStackOptions}
      />
      <NativeStack.Screen
        name="StakeScreens"
        component={StakeScreenStack}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.EARN.ROOT}
        component={EarnScreenStack}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen
        name={Routes.EARN.MODALS.ROOT}
        component={EarnModalStack}
        options={transparentModalStackOptions}
      />
      {isMoneyAccountEnabled && (
        <>
          <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
            <NativeStack.Screen
              name={Routes.MONEY.ROOT}
              component={MoneyTabScreenStack}
            />
            <NativeStack.Screen
              name={Routes.MONEY.CONFIRMATIONS_ROOT}
              component={MoneyConfirmationScreenStack}
            />
            <NativeStack.Screen
              name={Routes.MONEY.POTENTIAL_EARNINGS}
              component={MoneyPotentialEarningsView}
            />
            <NativeStack.Screen
              name={Routes.MONEY.TRANSACTION_DETAILS}
              component={TransactionDetails}
            />
            <NativeStack.Screen
              name={Routes.MONEY.CARD_TRANSACTION_DETAILS}
              component={MoneyApiActivityDetailsView}
            />
          </NativeStack.Group>
          <NativeStack.Screen
            name={Routes.MONEY.ONBOARDING}
            component={MoneyOnboardingView}
            options={fadeNativeOptions}
          />
          <NativeStack.Screen
            name={Routes.MONEY.FIRST_TIME_DEPOSIT}
            component={MoneyFirstTimeDepositView}
            options={{
              ...transparentModalStackOptions,
              gestureEnabled: false,
            }}
          />
          <NativeStack.Screen
            name={Routes.MONEY.MODALS.ROOT}
            component={MoneyModalStack}
            options={transparentModalStackOptions}
          />
          <NativeStack.Screen
            name={Routes.TRANSACTIONS_VIEW}
            component={TransactionsHome}
            options={slideFromRightNativeOptions}
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
        options={transparentModalStackOptions}
      />
      <NativeStack.Screen
        name="StakeModals"
        component={StakeModalStack}
        options={transparentModalStackOptions}
      />
      {isPerpsEnabled && (
        <>
          <NativeStack.Screen
            name={Routes.PERPS.ROOT}
            component={PerpsScreenStack}
            options={slideFromRightNativeOptions}
          />
          <NativeStack.Screen
            name={Routes.PERPS.TUTORIAL}
            component={PerpsTutorialCarousel}
          />
          <NativeStack.Screen
            name={Routes.PERPS.MODALS.ROOT}
            component={PerpsModalStackWithErrorGate}
            options={transparentModalStackOptions}
          />
          <NativeStack.Screen
            name={Routes.PERPS.POSITION_TRANSACTION}
            component={PerpsPositionTransactionView}
          />
          <NativeStack.Screen
            name={Routes.PERPS.ORDER_TRANSACTION}
            component={PerpsOrderTransactionView}
          />
          <NativeStack.Screen
            name={Routes.PERPS.FUNDING_TRANSACTION}
            component={PerpsFundingTransactionView}
          />
          <NativeStack.Screen
            name={Routes.PERPS.PRICE_ALERTS}
            component={ManagePriceAlertsView}
          />
          <NativeStack.Screen
            name={Routes.PERPS.CREATE_PRICE_ALERT}
            component={CreatePriceAlertView}
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
            options={transparentModalStackOptions}
          />
        </>
      )}
      {(isMarketInsightsEnabled || isMarketInsightsPerpsEnabled) && (
        <NativeStack.Screen
          name={Routes.MARKET_INSIGHTS.VIEW}
          component={MarketInsightsView}
          options={slideFromRightNativeOptions}
        />
      )}
      {isSocialV1Enabled && (
        <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
          <NativeStack.Screen
            name={Routes.SOCIAL.V1}
            component={SocialV1View}
            options={{
              // `enableFreeze(true)` is global (index.js). The feed must keep
              // reacting to the composed-post store while the composer sits on
              // top, otherwise the posting banner and the committed post are
              // both swallowed by the frozen subtree.
              freezeOnBlur: false,
            }}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.POST_COMPOSER}
            component={SocialPostComposerView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.MY_PROFILE}
            component={MyProfileView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.FOLLOW_CONNECTIONS}
            component={FollowConnectionsView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.PROFILES_TO_FOLLOW}
            component={ProfilesToFollowView}
            options={{ headerShown: false, ...slideFromRightNativeOptions }}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.MANAGE_PROFILE}
            component={ManageProfileView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.MANAGE_PROFILE_TEXT_EDITOR}
            component={ManageProfileTextEditorView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.MANAGE_PROFILE_TRADING_ACTIVITY}
            component={ManageProfileTradingActivityView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.MANAGE_PROFILE_LINKED_ACCOUNT}
            component={ManageProfileLinkedAccountView}
          />
          <NativeStack.Screen
            name={Routes.SOCIAL.PROFILE_ONBOARDING}
            component={SocialProfileOnboardingView}
          />
        </NativeStack.Group>
      )}
      {isSocialLeaderboardEnabled && (
        <>
          <NativeStack.Screen
            name={Routes.SOCIAL.V0}
            component={SocialV0View}
            options={slideFromRightNativeOptions}
          />
          <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
            <NativeStack.Screen
              name={Routes.SOCIAL.PROFILE}
              component={TraderProfileView}
            />
            <NativeStack.Screen
              name={Routes.SOCIAL.POSITION}
              component={TraderPositionView}
            />
            <NativeStack.Screen
              name={Routes.SOCIAL.ONBOARDING}
              component={SocialLeaderboardOnboarding}
            />
          </NativeStack.Group>
          <NativeStack.Screen
            name={Routes.SOCIAL.TRADING_SIGNALS_SETUP}
            component={TradingSignalsSetupBottomSheet}
            options={transparentModalStackOptions}
          />
        </>
      )}
      <NativeStack.Group screenOptions={slideFromRightNativeOptions}>
        <NativeStack.Screen
          name={Routes.EXPLORE_SEARCH}
          component={ExploreSearchScreen}
        />
        <NativeStack.Screen
          name={Routes.SITES_FULL_VIEW}
          component={SitesFullView}
        />
        <NativeStack.Screen
          name={Routes.WHATS_HAPPENING_DETAIL}
          component={WhatsHappeningDetailView}
        />
      </NativeStack.Group>
      <NativeStack.Screen
        name={Routes.BROWSER.HOME}
        component={BrowserFlow}
        options={slideFromRightNativeOptions}
      />
      <NativeStack.Screen name="SetPasswordFlow" component={SetPasswordFlow} />
      {/* TODO: This is added to support slide 4 in the carousel - once changed this can be safely removed*/}
      <NativeStack.Screen name="GeneralSettings" component={GeneralSettings} />
      {process.env.METAMASK_ENVIRONMENT !== 'production' && (
        <NativeStack.Screen
          name={Routes.FEATURE_FLAG_OVERRIDE}
          component={FeatureFlagOverride}
        />
      )}
      <NativeStack.Screen
        name="DeFiProtocolPositionDetails"
        component={DeFiProtocolPositionDetails}
        options={slideFromRightNativeOptions}
      />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      }
      <NativeStack.Screen
        name={Routes.SAMPLE_FEATURE}
        component={SampleFeature}
      />
      {
        ///: END:ONLY_INCLUDE_IF
      }
      <NativeStack.Screen
        name={Routes.CARD.ROOT}
        component={CardRoutes}
        options={({ route }) => {
          const { animation } = (route.params ?? {}) as CardRootRouteParams;
          return {
            ...fullScreenModalSlideFromBottomNativeOptions,
            animation: animation ?? 'slide_from_right',
          };
        }}
      />
      <NativeStack.Screen
        name={Routes.RAMP.MODALS.PROCESSING_INFO}
        component={ProcessingInfoModal}
        options={transparentModalStackOptions}
      />
    </NativeStack.Navigator>
  );
};

export default MainNavigator;
