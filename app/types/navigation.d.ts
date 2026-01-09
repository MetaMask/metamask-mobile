/**
 * Navigation Types for React Navigation v7
 *
 * This file defines all navigation parameter lists for the app.
 * The global type augmentation at the bottom enables automatic typing
 * for useNavigation() calls throughout the codebase.
 *
 * @see https://reactnavigation.org/docs/typescript/
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// =============================================================================
// MODAL STACK
// =============================================================================

export type ModalStackParamList = {
  WalletActions: undefined;
  TradeWalletActions: undefined;
  FundActionMenu: undefined;
  DeleteWalletModal: undefined;
  ModalConfirmation: {
    onConfirm?: () => void;
    onCancel?: () => void;
    title?: string;
    description?: string;
  };
  ModalMandatory: {
    title?: string;
    description?: string;
    onAccept?: () => void;
  };
  WhatsNewModal: undefined;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  DetectedTokens: undefined;
  SRPRevealQuiz: {
    credentialName?: string;
  };
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: {
    origin?: string;
  };
  MultichainAccountDetailActions: undefined;
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;
  Pna25BottomSheet: undefined;
  RewardsBottomSheetModal: undefined;
  RewardsClaimBottomSheetModal: undefined;
  RewardsIntroModal: undefined;
  RewardOptInAccountGroupModal: undefined;
  RewardsReferralBottomSheetModal: undefined;
};

// =============================================================================
// SHEET STACK
// =============================================================================

export type SheetStackParamList = {
  AccountSelector: undefined;
  AddressSelector: undefined;
  AddAccount: undefined;
  AmbiguousAddress: {
    address?: string;
  };
  BasicFunctionality: undefined;
  ConfirmTurnOnBackupAndSync: undefined;
  ResetNotifications: undefined;
  SDKLoading: undefined;
  SDKFeedback: undefined;
  DataCollection: undefined;
  ExperienceEnhancer: undefined;
  SDKManageConnections: undefined;
  SDKDisconnect: {
    channelId?: string;
  };
  AccountConnect: {
    hostInfo?: unknown;
  };
  AccountPermissions: {
    hostInfo?: unknown;
  };
  RevokeAllAccountPermissions: {
    hostInfo?: unknown;
  };
  ConnectionDetails: {
    connectionKey?: string;
  };
  PermittedNetworksInfoSheet: undefined;
  NetworkSelector: undefined;
  AccountActions: {
    selectedAddress?: string;
  };
  SettingsAdvancedFiatOnTestnetsFriction: undefined;
  ShowIpfs: undefined;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: undefined;
  OriginSpamModal: {
    origin?: string;
    onProceed?: () => void;
    onReject?: () => void;
  };
  tooltipModal: {
    title?: string;
    tooltip?: React.ReactNode;
  };
  TokenSort: undefined;
  NetworkManager: undefined;
  ChangeInSimulationModal: undefined;
  SelectSRP: undefined;
  OnboardingSheet: {
    onConfirm?: () => void;
  };
  SeedphraseModal: undefined;
  SkipAccountSecurityModal: {
    onConfirm?: () => void;
    onCancel?: () => void;
  };
  SuccessErrorSheet: {
    title?: string;
    message?: string;
    isError?: boolean;
    onClose?: () => void;
  };
  EligibilityFailedModal: undefined;
  UnsupportedRegionModal: undefined;
  TokenInsights: {
    address?: string;
    chainId?: string;
  };
  // Multichain Account Details sub-routes
  MultichainAccountActions: undefined;
  EditMultichainAccountName: {
    address?: string;
  };
  LegacyEditMultichainAccountName: undefined;
  EditWalletName: undefined;
  ShareAddress: undefined;
  ShareAddressQR: undefined;
  DeleteAccount: undefined;
  RevealPrivateCredential: undefined;
  RevealSRPCredential: undefined;
  SRPRevealQuizInMultichainAccountDetails: undefined;
  SmartAccount: undefined;
};

// =============================================================================
// ONBOARDING STACK
// =============================================================================

export type OnboardingStackParamList = {
  OnboardingRootNav: undefined;
  OnboardingSuccessFlow: undefined;
  OnboardingSuccess: undefined;
  DefaultSettings: undefined;
  GeneralSettings: undefined;
  AssetsSettings: undefined;
  SecuritySettings: undefined;
  HomeNav: undefined;
  Onboarding: {
    delete?: boolean;
  };
  Login: undefined;
  OnboardingNav: {
    screen?: string;
    params?: Record<string, unknown>;
  };
  SocialLoginSuccessNewUser: undefined;
  ManualBackupStep1: undefined;
  ManualBackupStep2: {
    words?: string[];
  };
  ManualBackupStep3: {
    words?: string[];
  };
  ImportFromSecretRecoveryPhrase: undefined;
  ChoosePassword: undefined;
  OptinMetrics: undefined;
  SocialLoginSuccessExistingUser: undefined;
};

// =============================================================================
// BROWSER STACK
// =============================================================================

export type BrowserStackParamList = {
  BrowserTabHome: undefined;
  BrowserView: {
    url?: string;
    newTab?: boolean;
  };
  AssetLoader: {
    address?: string;
    chainId?: string;
  };
  AssetView: {
    address?: string;
    chainId?: string;
  };
};

// =============================================================================
// WALLET STACK
// =============================================================================

export type WalletStackParamList = {
  WalletTabHome: undefined;
  WalletTabStackFlow: {
    screen?: string;
    params?: Record<string, unknown>;
  };
  WalletConnectSessionsView: undefined;
  NftFullView: {
    nft?: unknown;
  };
  TokensFullView: undefined;
  TrendingTokensFullView: undefined;
  WalletView: undefined;
};

// =============================================================================
// SETTINGS STACK
// =============================================================================

export type SettingsStackParamList = {
  SettingsView: undefined;
  SecuritySettings: undefined;
  AdvancedSettings: undefined;
  ResetPassword: undefined;
  ContactForm: {
    mode?: 'add' | 'edit';
    contact?: unknown;
  };
  DeveloperOptions: undefined;
  ExperimentalSettings: undefined;
  NotificationsSettings: undefined;
  RevealPrivateCredentialView: {
    credentialName?: string;
    privateCredentialName?: string;
  };
  SDKSessionsManager: undefined;
  BackupAndSyncSettings: undefined;
};

// =============================================================================
// SEND FLOW
// =============================================================================

export type SendFlowParamList = {
  SendTo: {
    txMeta?: unknown;
  };
  Amount: {
    txMeta?: unknown;
  };
  Confirm: {
    txMeta?: unknown;
  };
  Send: undefined;
  Recipient: undefined;
  Asset: undefined;
};

// =============================================================================
// WEBVIEW
// =============================================================================

export type WebviewParamList = {
  Webview: {
    screen?: string;
    params?: {
      url?: string;
    };
  };
  SimpleWebview: {
    url?: string;
  };
};

// =============================================================================
// BRIDGE
// =============================================================================

export type BridgeParamList = {
  Bridge: undefined;
  BridgeView: undefined;
  BridgeTransactionDetails: {
    transactionId?: string;
  };
};

export type BridgeModalsParamList = {
  BridgeModals: undefined;
  BridgeSourceTokenSelector: undefined;
  BridgeSourceNetworkSelector: undefined;
  SlippageModal: undefined;
  BridgeDestTokenSelector: {
    token?: unknown;
    networkName?: string;
  };
  BridgeDestNetworkSelector: undefined;
  TransactionDetailsBlockExplorer: undefined;
  QuoteExpiredModal: undefined;
  BlockaidModal: undefined;
  RecipientSelectorModal: undefined;
};

// =============================================================================
// STAKING / EARN
// =============================================================================

export type StakingParamList = {
  Stake: undefined;
  StakeConfirmation: undefined;
  Unstake: undefined;
  UnstakeConfirmation: undefined;
  EarningsHistory: undefined;
  Claim: undefined;
  LearnMore: undefined;
  MaxInput: undefined;
  GasImpact: undefined;
  EarnTokenList: undefined;
};

export type EarnParamList = {
  EarnScreens: undefined;
  EarnLendingDepositConfirmation: undefined;
  EarnLendingWithdrawalConfirmation: undefined;
  EarnMusdConversionEducation: undefined;
  EarnModals: undefined;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: undefined;
};

// =============================================================================
// MULTICHAIN ACCOUNTS
// =============================================================================

export type MultichainAccountsParamList = {
  MultichainAccountDetails: {
    address?: string;
    accountGroup?: unknown;
  };
  MultichainAccountGroupDetails: {
    groupId?: string;
    accountGroup?: unknown;
  };
  MultichainWalletDetails: {
    walletId?: string;
  };
  MultichainAddressList: undefined;
  MultichainPrivateKeyList: undefined;
  MultichainAccountActions: undefined;
};

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export type NotificationsParamList = {
  NotificationsView: undefined;
  OptIn: undefined;
  OptInStack: undefined;
  NotificationsDetails: {
    notificationId?: string;
  };
};

// =============================================================================
// CONFIRMATIONS
// =============================================================================

export type ConfirmationsParamList = {
  RedesignedConfirmations: undefined;
  NoHeaderConfirmations: undefined;
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithNetworkModal: undefined;
  SmartAccountOptIn: undefined;
};

// =============================================================================
// RAMP / DEPOSIT
// =============================================================================

export type RampParamList = {
  Ramp: undefined;
  RampBuy: undefined;
  RampSell: undefined;
  RampTokenSelection: undefined;
  GetStarted: undefined;
  BuildQuote: undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: undefined;
  Checkout: undefined;
  OrderDetails: undefined;
  SendTransaction: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
};

export type DepositParamList = {
  Deposit: undefined;
  DepositRoot: undefined;
  BuildQuote: {
    animationEnabled?: boolean;
  };
  EnterEmail: undefined;
  OtpCode: undefined;
  VerifyIdentity: undefined;
  BasicInfo: undefined;
  EnterAddress: undefined;
  KycProcessing: undefined;
  OrderProcessing: undefined;
  DepositOrderDetails: {
    orderId?: string;
  };
  BankDetails: undefined;
  AdditionalVerification: undefined;
};

// =============================================================================
// PERPS / PREDICT
// =============================================================================

export type PerpsParamList = {
  Perps: undefined;
  PerpsTradingView: undefined;
  PerpsOrder: undefined;
  PerpsWithdraw: undefined;
  PerpsPositions: undefined;
  PerpsMarketListView: undefined;
  PerpsMarketDetails: {
    marketId?: string;
  };
  PerpsTrendingView: undefined;
  PerpsTutorial: undefined;
  PerpsClosePosition: undefined;
  PerpsHIP3Debug: undefined;
  PerpsTPSL: undefined;
  PerpsAdjustMargin: undefined;
  PerpsSelectModifyAction: undefined;
  PerpsSelectAdjustMarginAction: undefined;
  PerpsSelectOrderType: undefined;
  PerpsOrderDetailsView: undefined;
  PerpsPnlHeroCard: undefined;
  PerpsActivity: undefined;
  PerpsOrderBook: undefined;
  PerpsPositionTransaction: undefined;
  PerpsOrderTransaction: undefined;
  PerpsFundingTransaction: undefined;
};

export type PredictParamList = {
  Predict: undefined;
  PredictMarketList: undefined;
  PredictMarketDetails: {
    marketId?: string;
  };
  PredictActivityDetail: undefined;
};

// =============================================================================
// CARD
// =============================================================================

export type CardParamList = {
  CardScreens: undefined;
  CardMainRoutes: undefined;
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: undefined;
  CardNotification: undefined;
  CardSpendingLimit: undefined;
  CardChangeAsset: undefined;
  VerifyingRegistration: undefined;
  CardOnboarding: undefined;
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail: undefined;
  CardOnboardingSetPhoneNumber: undefined;
  CardOnboardingConfirmPhoneNumber: undefined;
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingValidatingKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingMailingAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingWebview: undefined;
};

// =============================================================================
// ROOT STACK - COMBINES ALL NAVIGATORS
// =============================================================================

export type RootStackParamList = {
  // Main screens
  WalletView: undefined;
  BrowserTabHome: undefined;
  BrowserView: BrowserStackParamList['BrowserView'];
  SettingsView: undefined;
  TransactionsView: undefined;
  TransactionDetails: {
    transactionId?: string;
  };

  // Navigators (using NavigatorScreenParams for nested navigation)
  RootModalFlow: NavigatorScreenParams<ModalStackParamList>;
  OnboardingRootNav: NavigatorScreenParams<OnboardingStackParamList>;
  OnboardingNav: OnboardingStackParamList['OnboardingNav'];

  // Wallet
  WalletTabHome: NavigatorScreenParams<WalletStackParamList>;
  WalletTabStackFlow: WalletStackParamList['WalletTabStackFlow'];

  // Browser
  BrowserTabHome: NavigatorScreenParams<BrowserStackParamList>;

  // Webview
  Webview: WebviewParamList['Webview'];
  SimpleWebview: WebviewParamList['SimpleWebview'];

  // Settings
  Settings: string;

  // Send
  SendTo: SendFlowParamList['SendTo'];
  Amount: SendFlowParamList['Amount'];
  Confirm: SendFlowParamList['Confirm'];
  Send: undefined;

  // Features
  QRScanner: undefined;
  LockScreen: undefined;
  FoxLoader: undefined;

  // Hardware Wallet
  ConnectHardwareWalletFlow: undefined;
  SelectHardwareWallet: undefined;
  ConnectQRHardwareFlow: undefined;
  ConnectLedgerFlow: undefined;
  LedgerConnect: undefined;
  LedgerMessageSignModal: undefined;
  LedgerTransactionModal: undefined;

  // Networks
  AddNetwork: undefined;
  EditNetwork: {
    network?: string;
    shouldNetworkSwitchPopToWallet?: boolean;
    shouldShowPopularNetworks?: boolean;
    trackRpcUpdateFromBanner?: boolean;
  };

  // Accounts
  EditAccountName: undefined;
  ImportPrivateKeyView: undefined;
  ImportSRPView: undefined;

  // Multichain Accounts
  MultichainAccountDetails: MultichainAccountsParamList['MultichainAccountDetails'];
  MultichainAccountGroupDetails: MultichainAccountsParamList['MultichainAccountGroupDetails'];
  MultichainWalletDetails: MultichainAccountsParamList['MultichainWalletDetails'];
  MultichainAddressList: undefined;
  MultichainPrivateKeyList: undefined;

  // Asset management
  AssetHideConfirmation: {
    asset?: unknown;
  };
  AssetOptions: {
    asset?: unknown;
  };
  NftOptions: {
    nft?: unknown;
  };
  DetectedTokens: undefined;
  DetectedTokensConfirmation: {
    tokens?: unknown[];
  };

  // Confirmations
  RedesignedConfirmations: undefined;
  NoHeaderConfirmations: undefined;
  ConfirmationRequestModal: undefined;

  // Staking/Earn
  Stake: undefined;
  EarnScreens: NavigatorScreenParams<EarnParamList>;

  // Bridge
  Bridge: NavigatorScreenParams<BridgeParamList>;
  BridgeModals: NavigatorScreenParams<BridgeModalsParamList>;

  // Ramp
  Ramp: NavigatorScreenParams<RampParamList>;
  Deposit: NavigatorScreenParams<DepositParamList>;

  // Perps/Predict
  Perps: NavigatorScreenParams<PerpsParamList>;
  PerpsModals: undefined;
  Predict: NavigatorScreenParams<PredictParamList>;
  PredictModals: undefined;

  // Card
  CardScreens: NavigatorScreenParams<CardParamList>;
  CardModals: undefined;

  // Notifications
  NotificationsView: undefined;
  OptInStack: undefined;

  // Rewards
  RewardsView: undefined;
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsDashboard: undefined;
  TrendingView: undefined;
  TrendingFeed: undefined;

  // Vault Recovery
  RestoreWallet: undefined;
  WalletRestored: undefined;
  WalletResetNeeded: undefined;

  // SDK
  ReturnToDappToast: undefined;

  // Misc
  SeedphraseModal: undefined;
  SetPasswordFlow: undefined;
  FeatureFlagOverride: undefined;
  SitesFullView: undefined;
  ExploreSearch: undefined;
  DeprecatedNetworkDetails: undefined;

  // Snaps
  SnapsSettingsList: undefined;
  SnapSettings: {
    snapId?: string;
  };

  // Add new account bottom sheet
  AddNewAccountBottomSheet: {
    accountGroup?: unknown;
  };

  // Catch-all for dynamic routes (allows any string key with any params)
  [key: string]: undefined | Record<string, unknown> | NavigatorScreenParams<Record<string, unknown>>;
};

// =============================================================================
// GLOBAL TYPE AUGMENTATION
// =============================================================================
// This makes useNavigation() automatically typed everywhere in the app
// without needing to pass type parameters.

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export type NavigationParams = Record<string, unknown> | undefined;

// Screen props helper
export type ScreenProps<T extends keyof RootStackParamList> = {
  route: {
    params: RootStackParamList[T];
  };
  navigation: unknown;
};

