/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-namespace */
import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root navigation param list for the entire app.
 * This provides type safety for navigation.navigate() calls.
 *
 * Note: Use `undefined` for screens with no params, or define the expected params type.
 * Screens with optional params should use `ParamType | undefined`.
 *
 * @see https://reactnavigation.org/docs/typescript/?config=dynamic#type-checking-screens
 */
// This MUST use type and not interface according to docs
export type RootParamList = {
  // Onboarding Flow
  OnboardingRootNav: undefined;
  OnboardingNav: undefined;
  Onboarding: undefined;
  ChoosePassword: undefined;
  ImportFromSecretRecoveryPhrase: undefined;
  OnboardingSuccess: undefined;
  OnboardingSuccessFlow: undefined;
  DefaultSettings: undefined;
  SocialLoginSuccessNewUser: undefined;
  SocialLoginSuccessExistingUser: undefined;
  AccountStatus: undefined;
  AccountAlreadyExists: undefined;
  AccountNotFound: undefined;
  Rehydrate: undefined;
  OptinMetrics: undefined;
  Login: { locked?: boolean } | undefined;
  FoxLoader: undefined;

  // Account Backup Flow
  AccountBackupStep1: undefined;
  AccountBackupStep1B: undefined;
  ManualBackupStep1: undefined;
  ManualBackupStep2: undefined;
  ManualBackupStep3: undefined;
  WalletRecovery: undefined;

  // Main App Navigation
  HomeNav: undefined;
  Main: undefined;
  Home: undefined;
  ReviewModal: undefined;

  // Wallet Flow
  WalletView:
    | { shouldSelectPerpsTab?: boolean; initialTab?: string }
    | undefined;
  WalletTabHome: undefined;
  WalletHome: undefined;

  // Asset Screens
  Asset:
    | {
        address?: string;
        symbol?: string;
        chainId?: string;
        isFromSearch?: boolean;
      }
    | undefined;
  AssetDetails: { address?: string } | undefined;
  AddAsset:
    | { assetType?: string; collectibleContract?: { address: string } }
    | undefined;
  ConfirmAddAsset: undefined;
  Collectible: undefined;
  CollectiblesDetails: { collectible?: object } | undefined;
  NftDetails: { collectible?: object } | undefined;
  NftDetailsFullImage: { collectible?: object } | undefined;
  TokensFullView: undefined;
  TrendingTokensFullView: undefined;
  AssetLoader: undefined;

  // Browser Flow
  BrowserTabHome: undefined;
  BrowserView:
    | {
        url?: string;
        linkType?: string;
        newTabUrl?: string;
        existingTabId?: string;
        timestamp?: number;
      }
    | undefined;
  BrowserHome: undefined;
  AddBookmark:
    | {
        title?: string;
        url?: string;
        onAddBookmark?: (bookmark: { name: string; url: string }) => void;
      }
    | undefined;
  SimpleWebview: { url?: string; title?: string } | undefined;

  // Settings Flow
  SettingsFlow: undefined;
  Settings: undefined;
  SettingsView: undefined;
  GeneralSettings: undefined;
  AdvancedSettings: undefined;
  SecuritySettings: undefined;
  ExperimentalSettings: undefined;
  NotificationsSettings: undefined;
  BackupAndSyncSettings: undefined;
  DeveloperOptions: undefined;
  NetworksSettings: undefined;
  NetworkSettings:
    | { network?: object; isFullScreenModal?: boolean }
    | undefined;
  CompanySettings: undefined;
  ContactsSettings: undefined;
  ContactForm:
    | { mode?: string; addressToAdd?: string; editMode?: string }
    | undefined;
  SDKSessionsManager: { trigger?: number } | undefined;
  PermissionsManager: undefined;
  WalletConnectSessionsView: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RevealPrivateCredentialView:
    | { credentialName?: string; cancel?: () => void }
    | undefined;
  ResetPassword: undefined;
  EnterPasswordSimple:
    | { onPasswordSet?: (password: string) => void }
    | undefined;
  RegionSelector: undefined;

  // Snaps
  SnapsSettingsList: undefined;
  SnapSettings: { snap?: object } | undefined;

  // Transaction Flow
  TransactionsView: undefined;
  TransactionDetails: { transactionObject?: object } | undefined;
  SendView: undefined;
  SendAsset: undefined;
  SendFlowView: undefined;
  SendTo: undefined;
  Amount: undefined;
  Confirm: undefined;

  // Swap Flow
  Swaps:
    | { sourceToken?: string; destinationToken?: string; sourcePage?: string }
    | undefined;
  SwapsAmountView:
    | {
        sourceToken?: string;
        destinationToken?: string;
        chainId?: string;
        sourcePage?: string;
      }
    | undefined;
  SwapsQuotesView: undefined;

  // Ramp Flow
  Ramp: undefined;
  RampBuy: undefined;
  RampSell: undefined;
  GetStarted: undefined;
  BuildQuote: undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: undefined;
  Checkout: undefined;
  OrderDetails: { orderId?: string } | undefined;
  SendTransaction: undefined;
  RampTokenSelection: undefined;
  RampTokenSelectorModal: undefined;
  RampFiatSelectorModal: undefined;
  RampRegionSelectorModal: undefined;
  RampUnsupportedRegionModal: undefined;
  RampUnsupportedTokenModal: undefined;
  RampPaymentMethodSelectorModal: undefined;
  RampSettingsModal: undefined;
  RampIncompatibleAccountTokenModal: undefined;

  // Deposit Flow
  Deposit: undefined;
  DepositRoot: undefined;
  EnterEmail: undefined;
  OtpCode: undefined;
  VerifyIdentity: undefined;
  BasicInfo: undefined;
  EnterAddress: undefined;
  KycProcessing: undefined;
  OrderProcessing: undefined;
  DepositOrderDetails: { orderId?: string } | undefined;
  BankDetails: undefined;
  AdditionalVerification: undefined;
  DepositTokenSelectorModal: undefined;
  DepositRegionSelectorModal: undefined;
  DepositPaymentMethodSelectorModal: undefined;
  DepositUnsupportedRegionModal: undefined;
  DepositUnsupportedStateModal: undefined;
  DepositStateSelectorModal: undefined;
  DepositWebviewModal: undefined;
  DepositKycWebviewModal: undefined;
  IncompatibleAccountTokenModal: undefined;
  SsnInfoModal: undefined;
  DepositConfigurationModal: undefined;
  DepositErrorDetailsModal: undefined;

  // Bridge Flow
  BridgeRoot: undefined;
  BridgeModalsRoot: undefined;
  BridgeView: undefined;
  BridgeSettings: undefined;
  BridgeTransactionDetails: { transaction?: object } | undefined;

  // Staking/Earn Flow
  StakeScreens: undefined;
  Stake: undefined;
  StakeConfirmation: undefined;
  Unstake: undefined;
  UnstakeConfirmation: undefined;
  Claim: undefined;
  LearnMore: { chainId?: string } | undefined;
  MaxInput: undefined;
  GasImpact: undefined;
  EarningsHistory: undefined;
  EarnScreens: undefined;
  EarnTokenList: undefined;
  EarnLendingDepositConfirmation: undefined;
  EarnLendingWithdrawalConfirmation: undefined;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: undefined;
  StakeModalStack: undefined;

  // Card Flow
  CardRoutes: undefined;
  CardScreens: undefined;
  CardHome: undefined;

  // Perps Flow
  PerpsRoot: undefined;
  PerpsTutorial: undefined;
  PerpsModalsRoot: undefined;
  PerpsPositionTransaction: undefined;
  PerpsOrderTransaction: undefined;
  PerpsFundingTransaction: undefined;
  PerpsMarketDetails: undefined;
  PerpsOrder: undefined;

  // Predict Flow
  PredictRoot: undefined;
  PredictModalsRoot: undefined;

  // Rewards Flow
  RewardsView: undefined;
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsDashboard: undefined;
  RewardsOnboardingFlow: undefined;
  RewardsOnboardingIntro: undefined;
  RewardsOnboarding1: undefined;
  RewardsOnboarding2: undefined;
  RewardsOnboarding3: undefined;
  RewardsOnboarding4: undefined;
  RewardsBottomSheetModal: undefined;
  RewardsClaimBottomSheetModal: undefined;
  RewardsIntroModal: undefined;
  RewardOptInAccountGroupModal: undefined;
  RewardsReferralBottomSheetModal: undefined;
  EndOfSeasonClaimBottomSheet: undefined;

  // Notifications Flow
  NotificationsView: undefined;
  NotificationsDetails: { notification?: object } | undefined;
  OptIn: undefined;
  NotificationsOptInStack: undefined;
  OptInStack: undefined;

  // Hardware Wallet
  ConnectHardwareWalletFlow: undefined;
  SelectHardwareWallet: undefined;
  ConnectQRHardwareFlow: undefined;
  ConnectLedgerFlow: undefined;
  LedgerConnect: undefined;
  LedgerMessageSignModal: undefined;
  LedgerTransactionModal: undefined;

  // Account Management
  AccountSelector: undefined;
  AddressSelector: undefined;
  AccountConnect: { hostInfo?: object } | undefined;
  AccountPermissions: undefined;
  AccountPermissionsAsFullScreen: undefined;
  AccountPermissionsConfirmRevokeAll: undefined;
  ConnectionDetails: undefined;
  AddNewAccountBottomSheet: undefined;
  ImportPrivateKey: undefined;
  ImportPrivateKeySuccess: undefined;
  MultichainAccountDetailActions: undefined;
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;
  AccountDetails: undefined;
  AccountGroupDetails: undefined;
  WalletDetails: undefined;

  // Multi-SRP
  ImportNewSecretRecoveryPhrase: undefined;
  MultichainAccountAddressList: undefined;
  MultichainAccountPrivateKeyList: undefined;

  // QR Scanner
  QRTabSwitcher: { onScanSuccess?: (data: string) => void } | undefined;
  QRScanner: undefined;

  // Modals
  DeleteWalletModal: undefined;
  RootModalFlow: undefined;
  ModalConfirmation:
    | {
        title?: string;
        description?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
      }
    | undefined;
  ModalMandatory: undefined;
  WhatsNewModal: undefined;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  DetectedTokens: undefined;
  DetectedTokensConfirmation: { isHidingAll?: boolean } | undefined;
  SRPRevealQuiz: { page?: number } | undefined;
  WalletActions: undefined;
  TradeWalletActions: undefined;
  FundActionMenu: undefined;
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: undefined;
  Pna25BottomSheet: undefined;
  OTAUpdatesModal: undefined;
  DataCollectionModal: undefined;
  OptionsSheet: undefined;
  AssetHideConfirmation: { asset?: object } | undefined;
  AssetOptions: { asset?: object } | undefined;
  NftOptions: { collectible?: object } | undefined;
  OnboardingSheet: undefined;
  OriginSpamModal: undefined;
  TooltipModal: undefined;
  ChangeInSimulationModal: undefined;
  SuccessErrorSheet: undefined;
  LearnMoreBottomSheet: undefined;
  TurnOnBackupAndSync: undefined;
  ConfirmTurnOnBackupAndSync: undefined;
  ReturnToAppNotification: undefined;
  PayWithModal: undefined;
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: undefined;
  SmartAccountOptIn: undefined;

  // SDK
  SDKSessionModal: undefined;
  SDKDisconnectModal: undefined;

  // Network
  NetworkSelector: undefined;
  DeprecatedNetworkDetails: undefined;
  NetworkManager: undefined;

  // Vault Recovery
  RestoreWallet: undefined;
  WalletRestored: undefined;
  WalletRestoredError: undefined;

  // Confirmations
  RedesignedConfirmations: undefined;

  // Token Sort
  TokenSortBottomSheet: undefined;

  // Explore/Trending
  TrendingView: undefined;
  TrendingFeed: undefined;
  SitesFullView: undefined;
  ExploreSearch: undefined;

  // Payment
  PaymentRequest: undefined;
  PaymentRequestSuccess: undefined;

  // DeFi
  DeFiProtocolPositionDetails: undefined;

  // Offline
  OfflineMode: undefined;

  // Identity
  TurnOnBackupAndSyncFlow: undefined;

  // Miscellaneous
  Webview: undefined;
  SetPasswordFlow: undefined;
  FeatureFlagOverride: undefined;
  ProfilerManager: undefined;
};

/**
 * Extended param list that supports nested navigation.
 */
export type NavigatableRootParamList = {
  [K in keyof RootParamList]:
    | RootParamList[K] // Direct navigation
    | NavigatorScreenParams<RootParamList>; // Nested navigation
};

/**
 * Specifying default types for React Navigation.
 * This enables type-safe navigation without needing to explicitly type each hook.
 *
 * @see https://reactnavigation.org/docs/typescript/?config=dynamic#specifying-default-types-for-usenavigation-link-ref-etc
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends NavigatableRootParamList {}
  }

  /**
   * Global type alias so NavigationContainerRef defaults to NavigatableRootParamList everywhere.
   */
  type TypedNavigationContainerRef =
    import('@react-navigation/native').NavigationContainerRef<NavigatableRootParamList>;
}
