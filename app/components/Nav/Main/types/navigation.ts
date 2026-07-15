import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  AssetLoaderParams,
  AssetViewParams,
} from '../../../Views/Asset/Asset.types';
import type { TokenDetailsRouteParams } from '../../../UI/TokenDetails/constants/constants';
import type {
  CreatePriceAlertRouteParams,
  PriceAlertRouteParams,
} from '../../../UI/Assets/PriceAlerts/constants';
import type { RevealPrivateCredentialParams } from '../../../Views/RevealPrivateCredential/RevealPrivateCredential.types';
import type { NetworkDetailsViewParams } from '../../../Views/NetworksManagement/NetworkDetailsView/NetworkDetailsView.types';
import type { ContactFormParams } from '../../../Views/Settings/Contacts/ContactForm.types';
import type { NotificationSettingsSectionProps } from '../../../Views/Settings/NotificationsSettings/NotificationSettingsSection';
import type { RegionSelectorParams } from '../../../Views/Modals/Modals.types';
import type {
  AccountBackupParams,
  ManualBackupStep3Params,
} from '../../../Views/AccountBackup/AccountBackup.types';
import type {
  ManualBackupStep1Params,
  ManualBackupStep2Params,
} from '../../../Views/ManualBackupStep1/ManualBackupStep1.types';
import type { BrowserParams } from '../../../Views/Browser/Browser.types';
import type { SimpleWebviewParams } from '../../../Views/Webview/Webview.types';
import type { ExploreFeedRouteParams } from '../../../Views/TrendingView/TrendingView';
import type { ChoosePasswordRouteParams } from '../../../Views/ChoosePassword/ChoosePassword.types';
import type { OptinMetricsRouteParams } from '../../../UI/OptinMetrics/OptinMetrics.types';
import type { QRTabSwitcherParams } from '../../../Views/QRTabSwitcher/QRTabSwitcher';
import type { TransactionsViewParams } from '../../../Views/TransactionsView/TransactionsView.types';
import type { RampOrderDetailsParams } from '../../../UI/Ramp/Aggregator/types/navigation';
import type { RampNavigationParamList } from '../../../UI/Ramp/types/navigation';
import type { BridgeTransactionDetailsParams } from '../../../UI/Bridge/Bridge.types';

/**
 * Param list for screens inside `AssetStackFlow` (token details + alerts).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type AssetStackParamList = {
  Asset: AssetViewParams | undefined;
  SecurityTrust: TokenDetailsRouteParams & {
    isPricePositive?: boolean;
    useAmbientColor?: boolean;
  };
  CreatePriceAlert: CreatePriceAlertRouteParams;
  ManagePriceAlerts: PriceAlertRouteParams;
};

/**
 * Param list for screens inside `WalletTabStackFlow`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WalletTabStackParamList = {
  WalletView: undefined;
  RevealPrivateCredential: RevealPrivateCredentialParams | undefined;
};

/**
 * `WalletTabHome` is registered with component `WalletTabStackFlow`, but many
 * call sites still navigate with an intermediate `WalletTabStackFlow` screen.
 * Include both the real stack screens and that nested form.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WalletTabHomeParamList = WalletTabStackParamList & {
  WalletTabStackFlow:
    | NavigatorScreenParams<WalletTabStackParamList>
    | undefined;
};

/**
 * Param list for screens inside `SettingsFlow` (`SettingsView`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SettingsStackParamList = {
  AccountsMenuView: undefined;
  Settings: undefined;
  GeneralSettings: undefined;
  AdvancedSettings: { scrollToBottom?: boolean } | undefined;
  NetworksManagement: undefined;
  NetworkDetails: NetworkDetailsViewParams | undefined;
  SDKSessionsManager: undefined;
  SecuritySettings: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RampHeadlessPlayground: undefined;
  AesCryptoTestForm: undefined;
  ExperimentalSettings: undefined;
  CompanySettings: undefined;
  DeveloperOptions: undefined;
  ContactsSettings: undefined;
  ContactForm: ContactFormParams | undefined;
  RevealPrivateCredentialView: RevealPrivateCredentialParams | undefined;
  WalletConnectSessionsView: undefined;
  ResetPassword: undefined;
  WalletRecovery: undefined;
  AccountBackupStep1B: AccountBackupParams | undefined;
  ManualBackupStep1: ManualBackupStep1Params | undefined;
  ManualBackupStep2: ManualBackupStep2Params | undefined;
  ManualBackupStep3: ManualBackupStep3Params;
  EnterPasswordSimple: undefined;
  NotificationsSettings: undefined;
  NotificationSettingsSection: NotificationSettingsSectionProps['route']['params'];
  BackupAndSyncSettings: undefined;
  SettingsRegionSelector: RegionSelectorParams | undefined;
  SnapsSettingsList: undefined;
};

/**
 * Param list for screens inside `ExploreHome` (`TrendingView` tab).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TrendingViewStackParamList = {
  TrendingFeed: ExploreFeedRouteParams | undefined;
};

/**
 * Param list for screens inside `BrowserFlow` (`BrowserTabHome`).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserTabHomeParamList = {
  BrowserView: BrowserParams | undefined;
  AssetLoader: AssetLoaderParams | undefined;
  AssetView: AssetViewParams | undefined;
};

/**
 * Param list for screens inside the `Webview` stack.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type WebviewStackParamList = {
  SimpleWebview: SimpleWebviewParams | undefined;
};

/**
 * Param list for screens inside `SetPasswordFlow`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SetPasswordFlowParamList = {
  ChoosePassword: ChoosePasswordRouteParams | undefined;
  AccountBackupStep1: AccountBackupParams | undefined;
  AccountBackupStep1B: AccountBackupParams | undefined;
  ManualBackupStep1: ManualBackupStep1Params | undefined;
  ManualBackupStep2: ManualBackupStep2Params | undefined;
  ManualBackupStep3: ManualBackupStep3Params;
  OptinMetrics: OptinMetricsRouteParams | undefined;
};

/**
 * Param list for screens inside `ImportPrivateKeyView` (App root stack).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ImportPrivateKeyStackParamList = {
  ImportPrivateKey: undefined;
  ImportPrivateKeySuccess: undefined;
  QRTabSwitcher: QRTabSwitcherParams | undefined;
};

/**
 * Param list for screens inside `MoneyTabScreenStack` (Money tab under Home).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MoneyTabStackParamList = {
  MoneyHome: undefined;
  MoneyActivity: undefined;
  MoneyHowItWorks: undefined;
};

/**
 * Param list for screens inside `TransactionsHome` (Activity tab under Home).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type TransactionsHomeParamList = {
  TransactionsView: TransactionsViewParams | undefined;
  OrderDetails: RampOrderDetailsParams | undefined;
  RampsOrderDetails: RampNavigationParamList['RampsOrderDetails'];
  DepositOrderDetails: undefined;
  RampBankDetailsStandalone: RampNavigationParamList['RampBankDetailsStandalone'];
  SendTransaction: undefined;
  BridgeTransactionDetails: BridgeTransactionDetailsParams | undefined;
};

/**
 * Param list for screens inside `RewardsHome` (Rewards tab under Home).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RewardsHomeParamList = {
  RewardsOnboardingFlow: undefined;
  RewardsDashboard: undefined;
};

/**
 * Param list for tabs inside `HomeTabs` (`Home`).
 *
 * Trade tab reuses `WalletTabStackFlow` as a placeholder component under
 * `TradeWalletActions`; Money vs Activity tabs are mutually exclusive at runtime.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type HomeTabsParamList = {
  WalletTabHome: NavigatorScreenParams<WalletTabHomeParamList> | undefined;
  TrendingView: NavigatorScreenParams<TrendingViewStackParamList> | undefined;
  BrowserTabHome: NavigatorScreenParams<BrowserTabHomeParamList> | undefined;
  TradeWalletActions:
    | NavigatorScreenParams<WalletTabStackParamList>
    | undefined;
  MoneyScreens: NavigatorScreenParams<MoneyTabStackParamList> | undefined;
  TransactionsView:
    | NavigatorScreenParams<TransactionsHomeParamList>
    | undefined;
  RewardsView: NavigatorScreenParams<RewardsHomeParamList> | undefined;
};

/**
 * Param list for `MainNavigator` (`ConnectedMain`).
 *
 * Phase 3 types the Home tab host used for nested deeplink / reset state.
 * Sibling MainNavigator screens remain typed flat on `RootStackParamList`.
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MainStackParamList = {
  Home: NavigatorScreenParams<HomeTabsParamList> | undefined;
};

/**
 * Param list for `MainFlow` (`Routes.MAIN_FLOW` / `Main` on the root stack).
 */
// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MainFlowParamList = {
  Main: NavigatorScreenParams<MainStackParamList> | undefined;
  ReviewModal: undefined;
};
