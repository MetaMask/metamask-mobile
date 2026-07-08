import type {
  ParamListBase,
  NavigationProp,
  NavigationState,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Position } from '@metamask/social-controllers';

// ============================================================================
// Import types from their source files
// ============================================================================

// Ledger modal params
import type { LedgerMessageSignModalParams } from '../../components/UI/LedgerModals/LedgerMessageSignModal';
import type { LedgerTransactionModalParams } from '../../components/UI/LedgerModals/LedgerTransactionModal';

// Browser params
import type { BrowserParams } from '../../components/Views/Browser/Browser.types';
import type { ActivityDetailsParams } from '../../components/Views/ActivityDetails/ActivityDetails.types';

// Bridge params
import type { BatchSellTokenSelectRouteParams } from '../../components/UI/Bridge/Views/BatchSellTokenSelect/types';
import type { BridgeRouteParams } from '../../components/UI/Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeTokenSelectorRouteParams } from '../../components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import type { HardwareWalletsSwapsRouteParams } from '../../components/UI/HardwareWallet/Swaps/flowStrategy';
import type { BatchSellNetworkFeeInfoModalParams } from '../../components/UI/Bridge/components/BatchSellNetworkFeeInfoModal/BatchSellNetworkFeeInfoModal.types';
import type { BatchSellMinimumReceivedInfoModalParams } from '../../components/UI/Bridge/components/BatchSellMinimumReceivedInfoModal/BatchSellMinimumReceivedInfoModal.types';
import type {
  BatchSellSlippageModalParams,
  SwapSlippageModalParams,
} from '../../components/UI/Bridge/components/SlippageModal/types';
import type {
  TransactionDetailsBlockExplorerParams,
  BlockaidModalParams,
  BridgeTransactionDetailsParams,
} from '../../components/UI/Bridge/Bridge.types';

// Manual backup params
import type {
  ManualBackupStep1Params,
  ManualBackupStep2Params,
} from '../../components/Views/ManualBackupStep1/ManualBackupStep1.types';

// View params from source files
import type { TooltipModalRouteParams } from '../../components/Views/TooltipModal/ToolTipModal.types';
import type { ChoosePasswordRouteParams } from '../../components/Views/ChoosePassword/ChoosePassword.types';
import type { AccountSelectorParams } from '../../components/Views/AccountSelector/AccountSelector.types';
import type { AddressSelectorParams } from '../../components/Views/AddressSelector/AddressSelector.types';
import type { AccountConnectParams } from '../../components/Views/MultichainAccounts/shared/AccountConnect.types';
import type { ShowTokenIdSheetParams } from '../../components/Views/ShowTokenIdSheet/ShowTokenIdSheet.types';
import type { ShowIpfsGatewaySheetParams } from '../../components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.types';
import type { SuccessErrorSheetParams } from '../../components/Views/SuccessErrorSheet/interface';
import type { OnboardingSheetParams } from '../../components/Views/OnboardingSheet';

// Modal params
import type { DeepLinkModalParams } from '../../components/UI/DeepLinkModal/types';
import type { OptinMetricsRouteParams } from '../../components/UI/OptinMetrics/OptinMetrics.types';
import type { OnboardingInterestQuestionnaireRouteParams } from '../../components/Views/OnboardingInterestQuestionnaire/OnboardingInterestQuestionnaire.types.ts';
import type { OnboardingCryptoExperienceQuestionnaireRouteParams } from '../../components/Views/OnboardingCryptoExperienceQuestionnaire/OnboardingCryptoExperienceQuestionnaire.types.ts';

// Perps navigation params
import type { PerpsNavigationParamList } from '../../components/UI/Perps/types/navigation';
import type { MoneyNavigationParamList } from '../../components/UI/Money/types/navigation';
import type { TrendingTokensFullViewParams } from '../../components/UI/Trending/Views/TrendingTokensFullView/TrendingTokensFullView';

// QR Scanner params
import type { QRScannerParams } from '../../components/Views/QRScanner/QRScanner.types';

// Ramp params
import type {
  RampBuySellParams,
  RampOrderDetailsParams,
  RampAggregatorBuildQuoteParams,
  SimpleRampBuildQuoteParams,
  WebviewModalParams,
  KycWebviewModalParams,
} from '../../components/UI/Ramp/Aggregator/types/navigation';
import type { DepositNavigationParams } from '../../components/UI/Ramp/types/depositNavigationParams';

// Transactions params
import type {
  TransactionsViewParams,
  TransactionDetailsParams,
} from '../../components/Views/TransactionsView/TransactionsView.types';

// Asset params
import type {
  AssetLoaderParams,
  AssetViewParams,
} from '../../components/Views/Asset/Asset.types';
import type { NftDetailsParams } from '../../components/Views/NftDetails/NftDetails.types';
import type { TokenDetailsRouteParams } from '../../components/UI/TokenDetails/constants/constants';
import type {
  PriceAlertRouteParams,
  CreatePriceAlertRouteParams,
} from '../../components/UI/Assets/PriceAlerts/constants';

// Stake params
import type {
  StakeParams,
  UnstakeParams,
  ClaimParams,
} from '../../components/UI/Stake/Views/StakeInputView/StakeInputView.types';
import type { TokenI } from '../../components/UI/Tokens/types';

// Send flow params
import type {
  SendFlowParams,
  SendAmountParams,
  SendConfirmParams,
  SendRecipientParams,
  SendAssetParams,
  SendParams,
} from '../../components/Views/SendFlow/SendFlow.types';

// Predict params
import type {
  PredictMarketListRouteParams,
  PredictMarketDetailsParams,
  PredictActivityDetailParams,
  PredictBuyPreviewParams,
  PredictSellPreviewParams,
  PredictFeedRouteParams,
  PredictWorldCupParams,
  PredictPositionsParams,
} from '../../components/UI/Predict/types/navigation';

// Account status params
import type { AccountStatusParams } from '../../components/Views/AccountStatus/types';
import type { TraceContext } from '../../util/trace';

// Add asset params
import type { AddAssetParams } from '../../components/Views/AddAsset/AddAsset';
import type { ImportAsset } from '../../components/Views/AddAsset/utils/utils';

// Contact form params
import type { ContactFormParams } from '../../components/Views/Settings/Contacts/ContactForm.types';

// SDK params
import type {
  SDKLoadingParams,
  SDKFeedbackParams,
  SDKDisconnectParams,
  ReturnToDappNotificationParams,
} from '../../components/Views/SDK/SDK.types';
import type { SDKConnectV2OtpModalParams } from '../../components/Views/SDK/SDKConnectV2OtpModal';

// Notification params
import type { NotificationDetailsParams } from '../../components/Views/Notifications/Notifications.types';

// Network params
import type {
  NetworkSelectorParams,
  AddNetworkParams,
  EditNetworkParams,
} from '../../components/Views/NetworkSelector/NetworkSelector.types';

// Account backup params
import type {
  AccountBackupParams,
  ManualBackupStep3Params,
} from '../../components/Views/AccountBackup/AccountBackup.types';

// Reveal credential params
import type {
  RevealPrivateCredentialParams,
  RevealSRPCredentialParams,
  SRPRevealQuizParams,
} from '../../components/Views/RevealPrivateCredential/RevealPrivateCredential.types';

// Card params
import type { CardConfirmModalParams } from '../../components/UI/Card/Card.types';
import type { ShippingAddress } from '../../components/UI/Card/util/buildUserAddress';

// Account actions params
import type {
  AccountActionsParams,
  AccountPermissionsParams,
  RevokeAllAccountPermissionsParams,
  ConnectionDetailsParams,
  AddAccountParams,
  AmbiguousAddressParams,
} from '../../components/Views/AccountActions/AccountActions.types';
import type {
  OnboardingOAuthRehydrateParams,
  RehydrateParams,
} from '../../components/Views/OAuthRehydration/OAuthRehydration.types';

// Multichain accounts params
import type {
  MultichainAccountDetailActionsParams,
  MultichainTransactionDetailsParams,
  MultichainAccountActionsParams,
  EditAccountNameParams,
  EditWalletNameParams,
  ShareAddressParams,
  ShareAddressQRParams,
  DeleteAccountParams,
  SmartAccountParams,
  MultichainAccountDetailsParams,
  MultichainAccountGroupDetailsParams,
  MultichainWalletDetailsParams,
  MultichainAddressListParams,
  PrivateKeyListParams,
} from '../../components/Views/MultichainAccounts/MultichainAccounts.types';

// Earn params
import type {
  StakeConfirmationParams,
  UnstakeConfirmationParams,
  LearnMoreModalParams,
  MaxInputModalParams,
  GasImpactModalParams,
  EarnScreensParams,
  LendingDepositConfirmationParams,
  LendingWithdrawalConfirmationParams,
  LendingMaxWithdrawalModalParams,
} from '../../components/UI/Earn/Earn.types';
import type { EarnTokenListViewRouteParams } from '../../components/UI/Earn/components/EarnTokenList';
import type { EarnMusdConversionEducationViewRouteParams } from '../../components/UI/Earn/Views/EarnMusdConversionEducationView';

// Modal params
import type {
  RootModalFlowParams,
  ModalConfirmationParams,
  ModalMandatoryParams,
  OptionsSheetParams,
  SelectSRPParams,
  SeedphraseModalParams,
  TransactionDetailsSheetParams,
  ShowNftDisplayMediaParams,
  OriginSpamModalParams,
  RegionSelectorParams,
  FoxLoaderParams,
  SnapSettingsParams,
} from '../../components/Views/Modals/Modals.types';

// Rewards params
import { BenefitFullViewRouteParams } from '../../components/UI/Rewards/Views/BenefitFullView.types.ts';
import type { RewardsNavigationParamList } from '../../components/UI/Rewards/types/navigation';

// Webview params
import type {
  WebviewParams,
  SimpleWebviewParams,
} from '../../components/Views/Webview/Webview.types';
import type { WhatsHappeningSourceValue } from '../../components/UI/WhatsHappening/constants';

/**
 * Generic type for nested navigation params.
 * Used when navigating to a screen within a nested navigator.
 */
export interface NestedNavigationParams {
  screen?: string;
  params?: object;
  [key: string]: unknown;
}

/** Onboarding social-login screens share AccountStatus params plus trace context. */
type SocialLoginRouteParams = AccountStatusParams & {
  previous_screen?: string;
};

/** Import SRP screen params from onboarding entry points. */
interface ImportFromSecretRecoveryPhraseParams {
  previous_screen: string;
  onboardingTraceCtx: TraceContext;
}

/** Confirm-add-asset screen params (includes callback for token list refresh). */
interface ConfirmAddAssetParams {
  selectedAsset: ImportAsset[];
  networkName: string;
  addTokenList: () => Promise<void>;
}

type TraderPositionViewParams =
  | {
      traderId: string;
      tokenSymbol: string;
      /** Fast path: passed from TraderProfileView row-tap. No fetch fires. */
      position: Position;
      positionId?: string;
      /** Optional — fetched via useTraderProfile when absent. */
      traderName?: string;
      /** Optional — fetched via useTraderProfile when absent. */
      traderImageUrl?: string;
      /** Wallet address; forwarded for QuickBuy analytics. */
      traderAddress?: string;
      /** Analytics entry-point that opened the position view. Narrowed at the
       * receiver into the QuickBuy / FollowTradingToken source enums. */
      source?: string;
      /** Whether the tapped position came from the closed list. Authoritative
       * closed/open signal (more reliable than re-deriving from fields). */
      isClosed?: boolean;
      /** Notification subtype forwarded from the social-trader-position
       * deeplink (e.g. `follow_newtrade_perp_long`). Attached to the
       * destination screen's analytics event for click attribution. */
      notificationSubtype?: string;
    }
  | {
      /** Deep-link path: triggers useTraderPosition to fetch by UUID. */
      positionId: string;
      traderId: string;
      tokenSymbol?: never;
      traderName?: never;
      traderImageUrl?: never;
      position?: never;
      /** Wallet address; forwarded for QuickBuy analytics. */
      traderAddress?: string;
      /** Analytics entry-point that opened the position view. Narrowed at the
       * receiver into the QuickBuy / FollowTradingToken source enums. */
      source?: string;
      /** Deep links have no list context; resolved heuristically downstream. */
      isClosed?: never;
      /** Notification subtype forwarded from the social-trader-position
       * deeplink (e.g. `follow_newtrade_perp_long`). Attached to the
       * destination screen's analytics event for click attribution. */
      notificationSubtype?: string;
    };

/**
 * Flattened param list for React Navigation compatibility.
 * Maps actual route name strings to their parameter types.
 * This provides TypeScript autocomplete and error checking for navigation.
 */
// Declared as a `type` (not `interface`) so it gains an *implicit* index
// signature and therefore satisfies React Navigation's `ParamListBase`
// constraint (used by `RouteProp`/`StackNavigationProp`), while `keyof`
// stays a strict union of literal route names (no real index signature).
// The repo's `consistent-type-definitions` rule prefers `interface`, but an
// interface would NOT get the implicit index signature and would break the
// `ParamListBase` constraint, so this declaration must stay a `type`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RootStackParamList = {
  // Top-level routes
  WalletView: undefined;
  BrowserTabHome: BrowserParams | NestedNavigationParams | undefined;
  BrowserView: BrowserParams | undefined;
  SettingsView: NestedNavigationParams | undefined;
  DeprecatedNetworkDetails: undefined;

  // Ramp routes
  Ramp: undefined;
  RampBuy: RampBuySellParams | undefined;
  RampSell: RampBuySellParams | undefined;
  RampTokenSelection: undefined;
  RampHeadlessEntry: undefined;
  GetStarted: undefined;
  /**
   * BuildQuote route is shared between:
   * - Ramp Aggregator: uses RampAggregatorBuildQuoteParams (showBack, assetId, amount, currency)
   * - Unified buy (Ramp): uses SimpleRampBuildQuoteParams
   */
  BuildQuote:
    | RampAggregatorBuildQuoteParams
    | SimpleRampBuildQuoteParams
    | undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: undefined;
  Checkout: undefined;
  OrderDetails: RampOrderDetailsParams | undefined;
  SendTransaction: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RampHeadlessPlayground: undefined;
  RampAmountInput:
    | (SimpleRampBuildQuoteParams & { nativeFlowError?: string })
    | undefined;
  RampModals: NestedNavigationParams | undefined;
  RampTokenSelectorModal: undefined;
  RampFiatSelectorModal: undefined;
  RampIncompatibleAccountTokenModal: undefined;
  RampRegionSelectorModal: undefined;
  RampPhoneCountrySelectorModal: undefined;
  RampUnsupportedRegionModal: undefined;
  RampUnsupportedTokenModal: undefined;
  RampPaymentMethodSelectorModal: undefined;
  RampSettingsModal: undefined;
  RampBuildQuoteSettingsModal: undefined;

  // Deposit routes
  Deposit: DepositNavigationParams | undefined;
  DepositRoot: DepositNavigationParams | undefined;
  EnterEmail: undefined;
  OtpCode: undefined;
  VerifyIdentity: undefined;
  BasicInfo: undefined;
  EnterAddress: Record<string, unknown> | undefined;
  KycProcessing: undefined;
  OrderProcessing: undefined;
  DepositOrderDetails: undefined;
  BankDetails: undefined;
  AdditionalVerification: undefined;
  DepositModals: undefined;
  DepositTokenSelectorModal: undefined;
  DepositRegionSelectorModal: undefined;
  DepositPaymentMethodSelectorModal: undefined;
  DepositUnsupportedRegionModal: undefined;
  DepositUnsupportedStateModal: undefined;
  DepositStateSelectorModal: undefined;
  DepositWebviewModal: WebviewModalParams | undefined;
  DepositKycWebviewModal: KycWebviewModalParams | undefined;
  IncompatibleAccountTokenModal: undefined;
  SsnInfoModal: undefined;
  DepositConfigurationModal: undefined;
  DepositErrorDetailsModal: undefined;

  // Hardware wallet routes
  ConnectHardwareWalletFlow: undefined;
  SelectHardwareWallet: undefined;
  ConnectQRHardwareFlow: undefined;
  ConnectLedgerFlow: undefined;
  LedgerConnect: undefined;
  LedgerMessageSignModal: LedgerMessageSignModalParams | undefined;
  LedgerTransactionModal: LedgerTransactionModalParams | undefined;
  QRSigningTransactionModal: undefined;
  QRTabSwitcher: undefined;

  // Misc top-level routes
  OptionsSheet: OptionsSheetParams | undefined;
  QRScanner: QRScannerParams;
  TransactionsView: TransactionsViewParams | undefined;
  TransactionDetails: TransactionDetailsParams | undefined;
  ActivityDetails: ActivityDetailsParams;
  RewardsView: undefined;
  RewardsFlow: NestedNavigationParams | undefined;
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsDashboard: undefined;
  TrendingView: undefined;
  TrendingFeed: undefined;
  WhatsHappeningDetailView:
    | { initialIndex?: number; source: WhatsHappeningSourceValue }
    | undefined;
  SitesFullView: { mode?: 'favorites' } | undefined;
  ExploreSearch: undefined;
  RewardsOnboardingFlow: undefined;
  RewardsOnboardingIntro: undefined;
  BenefitFullView: BenefitFullViewRouteParams;
  BenefitsFullView: undefined;

  // Rewards stack screens (registered in RewardsNavigator, navigated flat at runtime)
  RewardsVipSplashView: RewardsNavigationParamList['RewardsVipSplashView'];
  RewardsVipView: RewardsNavigationParamList['RewardsVipView'];
  RewardsVipTiersView: RewardsNavigationParamList['RewardsVipTiersView'];
  RewardsVipRefereeSplashView: RewardsNavigationParamList['RewardsVipRefereeSplashView'];
  RewardsVipRefereeView: RewardsNavigationParamList['RewardsVipRefereeView'];
  RewardsCampaignsView: RewardsNavigationParamList['RewardsCampaignsView'];
  RewardsCampaignTourStep: RewardsNavigationParamList['RewardsCampaignTourStep'];
  RewardsCampaignDetails: RewardsNavigationParamList['RewardsCampaignDetails'];
  RewardsOndoCampaignWinning: RewardsNavigationParamList['RewardsOndoCampaignWinning'];
  RewardsSeasonOneCampaignDetails: RewardsNavigationParamList['RewardsSeasonOneCampaignDetails'];
  RewardsCampaignMechanics: RewardsNavigationParamList['RewardsCampaignMechanics'];
  RewardsMusdCalculatorView: RewardsNavigationParamList['RewardsMusdCalculatorView'];
  RewardsOndoCampaignLeaderboard: RewardsNavigationParamList['RewardsOndoCampaignLeaderboard'];
  RewardsOndoRwaAssetSelector: RewardsNavigationParamList['RewardsOndoRwaAssetSelector'];
  RewardsOndoCampaignPortfolioView: RewardsNavigationParamList['RewardsOndoCampaignPortfolioView'];
  RewardsOndoCampaignStats: RewardsNavigationParamList['RewardsOndoCampaignStats'];
  RewardsPerpsTradingCampaignDetails: RewardsNavigationParamList['RewardsPerpsTradingCampaignDetails'];
  RewardsPerpsTradingCampaignLeaderboard: RewardsNavigationParamList['RewardsPerpsTradingCampaignLeaderboard'];
  RewardsPerpsTradingCampaignStats: RewardsNavigationParamList['RewardsPerpsTradingCampaignStats'];
  RewardsPerpsTradingCampaignWinning: RewardsNavigationParamList['RewardsPerpsTradingCampaignWinning'];
  RewardsPredictThePitchCampaignDetails: RewardsNavigationParamList['RewardsPredictThePitchCampaignDetails'];
  RewardsPredictThePitchCampaignLeaderboard: RewardsNavigationParamList['RewardsPredictThePitchCampaignLeaderboard'];
  RewardsPredictThePitchCampaignPortfolioView: RewardsNavigationParamList['RewardsPredictThePitchCampaignPortfolioView'];
  RewardsPredictThePitchCampaignWinning: RewardsNavigationParamList['RewardsPredictThePitchCampaignWinning'];
  RewardsPredictThePitchCampaignStats: RewardsNavigationParamList['RewardsPredictThePitchCampaignStats'];
  RewardsSelectSheet: RewardsNavigationParamList['RewardsSelectSheet'];

  // Modal routes
  DeleteWalletModal: undefined;
  RootModalFlow: RootModalFlowParams | NestedNavigationParams | undefined;
  ModalConfirmation: ModalConfirmationParams | undefined;
  ModalMandatory: ModalMandatoryParams | undefined;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  SRPRevealQuiz: SRPRevealQuizParams | undefined;
  WalletActions: undefined;
  TradeWalletActions: undefined;
  FundActionMenu: undefined;
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: DeepLinkModalParams | undefined;
  MultichainAccountDetailActions:
    | MultichainAccountDetailActionsParams
    | undefined;
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;
  Pna25BottomSheet: undefined;
  RewardsBottomSheetModal: undefined;
  RewardsClaimBottomSheetModal: undefined;
  RewardOptInAccountGroupModal: undefined;
  RewardsReferralBottomSheetModal: undefined;
  OTAUpdatesModal: undefined;
  EndOfSeasonClaimBottomSheet: undefined;

  // Onboarding routes
  OnboardingRootNav: undefined;
  OnboardingSuccessFlow: undefined;
  OnboardingSuccess: undefined;
  DefaultSettings: undefined;
  GeneralSettings: undefined;
  AssetsSettings: undefined;
  SecuritySettings: undefined;
  HomeNav: undefined;
  Home: NestedNavigationParams | undefined;
  Onboarding: undefined;
  Login: undefined;
  OnboardingNav: undefined;
  SocialLoginSuccessNewUser: SocialLoginRouteParams | undefined;
  ManualBackupStep1: ManualBackupStep1Params | undefined;
  ManualBackupStep2: ManualBackupStep2Params | undefined;
  ManualBackupStep3: ManualBackupStep3Params;
  ImportFromSecretRecoveryPhrase:
    | ImportFromSecretRecoveryPhraseParams
    | undefined;
  ChoosePassword: ChoosePasswordRouteParams | undefined;
  OptinMetrics: OptinMetricsRouteParams | undefined;
  OnboardingInterestQuestionnaire: OnboardingInterestQuestionnaireRouteParams;
  OnboardingCryptoExperienceQuestionnaire: OnboardingCryptoExperienceQuestionnaireRouteParams;
  SocialLoginSuccessExistingUser: SocialLoginRouteParams | undefined;
  AccountAlreadyExists: AccountStatusParams | undefined;
  AccountNotFound: AccountStatusParams | undefined;
  /** OAuth unlock screen nested in OnboardingNav (see Routes.ONBOARDING.ONBOARDING_OAUTH_REHYDRATE). */
  OnboardingOAuthRehydrate: OnboardingOAuthRehydrateParams | undefined;
  Rehydrate: RehydrateParams | undefined;

  // Send flow routes
  SendTo: SendFlowParams | undefined;
  Amount: SendAmountParams | undefined;
  Confirm: SendConfirmParams | undefined;

  // Account backup routes
  AccountBackupStep1B: AccountBackupParams | undefined;

  // Settings routes
  AdvancedSettings: undefined;
  ResetPassword: undefined;
  ContactForm: ContactFormParams | undefined;
  DeveloperOptions: undefined;
  ExperimentalSettings: undefined;
  NotificationsSettings: undefined;
  RevealPrivateCredentialView: RevealPrivateCredentialParams | undefined;
  SDKSessionsManager: undefined;
  BackupAndSyncSettings: undefined;
  SettingsRegionSelector: RegionSelectorParams | undefined;

  // Sheet routes
  AccountSelector: AccountSelectorParams | undefined;
  AddressSelector: AddressSelectorParams | undefined;
  AddAccount: AddAccountParams | undefined;
  AmbiguousAddress: AmbiguousAddressParams | undefined;
  BasicFunctionality: undefined;
  ConfirmTurnOnBackupAndSync: undefined;
  SDKLoading: SDKLoadingParams | undefined;
  SDKFeedback: SDKFeedbackParams | undefined;
  SDKConnectV2Otp: SDKConnectV2OtpModalParams;
  DataCollection: undefined;
  ExperienceEnhancer: undefined;
  SDKManageConnections: undefined;
  SDKDisconnect: SDKDisconnectParams | undefined;
  AccountConnect: AccountConnectParams | undefined;
  AccountPermissions: AccountPermissionsParams | undefined;
  RevokeAllAccountPermissions: RevokeAllAccountPermissionsParams | undefined;
  ConnectionDetails: ConnectionDetailsParams | undefined;
  PermittedNetworksInfoSheet: undefined;
  NetworkSelector: NetworkSelectorParams | undefined;
  AccountActions: AccountActionsParams;
  SettingsAdvancedFiatOnTestnetsFriction: undefined;
  ShowIpfs: ShowIpfsGatewaySheetParams | undefined;
  ShowNftDisplayMedia: ShowNftDisplayMediaParams | undefined;
  ShowTokenId: ShowTokenIdSheetParams | undefined;
  OriginSpamModal: OriginSpamModalParams | undefined;
  tooltipModal: TooltipModalRouteParams | undefined;
  TokenSort: undefined;
  NetworkManager: undefined;
  ChangeInSimulationModal: undefined;
  SelectSRP: SelectSRPParams | undefined;
  OnboardingSheet: OnboardingSheetParams | undefined;
  SeedphraseModal: SeedphraseModalParams | undefined;
  SkipAccountSecurityModal: undefined;
  SuccessErrorSheet: SuccessErrorSheetParams | undefined;
  EligibilityFailedModal: undefined;
  UnsupportedRegionModal: undefined;
  MultichainTransactionDetails: MultichainTransactionDetailsParams | undefined;
  TransactionDetailsSheet: TransactionDetailsSheetParams | undefined;

  // Multichain account details sheet routes
  MultichainAccountActions: MultichainAccountActionsParams | undefined;
  EditMultichainAccountName: EditAccountNameParams | undefined;
  LegacyEditMultichainAccountName: EditAccountNameParams | undefined;
  EditWalletName: EditWalletNameParams | undefined;
  ShareAddress: ShareAddressParams | undefined;
  ShareAddressQR: ShareAddressQRParams | undefined;
  DeleteAccount: DeleteAccountParams | undefined;
  RevealPrivateCredential: RevealPrivateCredentialParams | undefined;
  RevealSRPCredential: RevealSRPCredentialParams | undefined;
  SRPRevealQuizInMultichainAccountDetails: SRPRevealQuizParams | undefined;
  SmartAccount: SmartAccountParams | undefined;

  // Browser routes
  AssetLoader: AssetLoaderParams | undefined;
  AssetView: AssetViewParams | undefined;

  // Webview routes
  Webview: WebviewParams | NestedNavigationParams | undefined;
  SimpleWebview: SimpleWebviewParams | undefined;

  // Wallet routes
  WalletTabHome: NestedNavigationParams | undefined;
  WalletTabStackFlow: NestedNavigationParams | undefined;
  WalletConnectSessionsView: undefined;
  NftFullView: undefined;
  TokensFullView: undefined;
  CashTokensFullView: undefined;

  // Money routes — `MoneyScreens`/`MoneyModals`/`MoneyConfirmations` are nested
  // navigators; their screens are enumerated in `MoneyNavigationParamList`.
  MoneyScreens: NestedNavigationParams | undefined;
  MoneyModals: NestedNavigationParams | undefined;
  MoneyConfirmations: NestedNavigationParams | undefined;
  MoneyHome: MoneyNavigationParamList['MoneyHome'];
  MoneyActivity: MoneyNavigationParamList['MoneyActivity'];
  MoneyHowItWorks: MoneyNavigationParamList['MoneyHowItWorks'];
  MoneyOnboarding: MoneyNavigationParamList['MoneyOnboarding'];
  MoneyFirstTimeDeposit: MoneyNavigationParamList['MoneyFirstTimeDeposit'];
  MoneyPotentialEarnings: MoneyNavigationParamList['MoneyPotentialEarnings'];
  MoneyTransactionDetails: MoneyNavigationParamList['MoneyTransactionDetails'];
  MoneyCardTransactionDetails: MoneyNavigationParamList['MoneyCardTransactionDetails'];
  MoneyAddMoneySheet: MoneyNavigationParamList['MoneyAddMoneySheet'];
  MoneyMoreSheet: MoneyNavigationParamList['MoneyMoreSheet'];
  MoneyTransferSheet: MoneyNavigationParamList['MoneyTransferSheet'];
  MoneyApyInfoSheet: MoneyNavigationParamList['MoneyApyInfoSheet'];
  MoneyEarningsInfoSheet: MoneyNavigationParamList['MoneyEarningsInfoSheet'];
  MoneyBalanceInfoSheet: MoneyNavigationParamList['MoneyBalanceInfoSheet'];
  MoneyLinkCardSheet: MoneyNavigationParamList['MoneyLinkCardSheet'];
  MoneyEarnCryptoInfoSheet: MoneyNavigationParamList['MoneyEarnCryptoInfoSheet'];
  MoneyGeoBlockSheet: MoneyNavigationParamList['MoneyGeoBlockSheet'];
  TrendingTokensFullView: TrendingTokensFullViewParams | undefined;
  RWATokensFullView: undefined;

  // Vault recovery routes
  RestoreWallet: undefined;
  WalletRestored: undefined;
  WalletResetNeeded: undefined;

  // Network routes
  AddNetwork: AddNetworkParams | undefined;
  EditNetwork: EditNetworkParams | undefined;

  // Bridge routes
  Bridge: BridgeRouteParams | undefined;
  BridgeView: BridgeRouteParams | undefined;
  BridgeTokenSelector: BridgeTokenSelectorRouteParams | undefined;
  BatchSellTokenSelect: BatchSellTokenSelectRouteParams | undefined;
  BatchSellReview: undefined;
  BridgeModals: undefined;
  SwapDefaultSlippageModal: SwapSlippageModalParams | undefined;
  SwapCustomSlippageModal: SwapSlippageModalParams | undefined;
  BatchSellDefaultSlippageModal: BatchSellSlippageModalParams | undefined;
  BatchSellCustomSlippageModal: BatchSellSlippageModalParams | undefined;
  TransactionDetailsBlockExplorer:
    | TransactionDetailsBlockExplorerParams
    | undefined;
  BlockaidModal: BlockaidModalParams;
  RecipientSelectorModal: undefined;
  BatchSellDestinationTokenSelectorModal: undefined;
  BatchSellQuoteDetailsModal: undefined;
  BatchSellFinalReviewModal: undefined;
  BatchSellNetworkFeeInfoModal: BatchSellNetworkFeeInfoModalParams | undefined;
  BatchSellMinimumReceivedInfoModal:
    | BatchSellMinimumReceivedInfoModalParams
    | undefined;
  BridgeTransactionDetails:
    | BridgeTransactionDetailsParams
    | TransactionDetailsBlockExplorerParams
    | undefined;
  HardwareWalletsSwaps: HardwareWalletsSwapsRouteParams | undefined;

  // Perps routes - use PerpsNavigationParamList for type-safe perps navigation.
  // The `Perps` root is a nested stack navigator, so it also accepts the
  // `{ screen, params }` form for cross-stack navigation (e.g. from the social
  // leaderboard into PerpsMarketDetails).
  Perps: NestedNavigationParams | PerpsNavigationParamList['Perps'];
  PerpsTradingView: PerpsNavigationParamList['PerpsTradingView'];
  PerpsWithdraw: PerpsNavigationParamList['PerpsWithdraw'];
  PerpsPositions: PerpsNavigationParamList['PerpsPositions'];
  PerpsMarketListView: PerpsNavigationParamList['PerpsMarketListView'];
  PerpsMarketDetails: PerpsNavigationParamList['PerpsMarketDetails'];
  PerpsTrendingView: PerpsNavigationParamList['PerpsMarketListView'];
  PerpsTutorial: PerpsNavigationParamList['PerpsTutorial'];
  PerpsClosePosition: PerpsNavigationParamList['PerpsClosePosition'];
  PerpsHIP3Debug: undefined;
  PerpsTPSL: PerpsNavigationParamList['PerpsTPSL'];
  PerpsAdjustMargin: PerpsNavigationParamList['PerpsAdjustMargin'];
  PerpsSelectModifyAction: PerpsNavigationParamList['PerpsSelectModifyAction'];
  PerpsSelectAdjustMarginAction: PerpsNavigationParamList['PerpsSelectAdjustMarginAction'];
  PerpsSelectOrderType: PerpsNavigationParamList['PerpsSelectOrderType'];
  PerpsOrderDetailsView: PerpsNavigationParamList['PerpsOrderDetails'];
  PerpsPnlHeroCard: PerpsNavigationParamList['PerpsPnlHeroCard'];
  PerpsActivity: PerpsNavigationParamList['PerpsActivity'];
  PerpsOrderBook: PerpsNavigationParamList['PerpsOrderBook'];
  PerpsModals: PerpsNavigationParamList['PerpsModals'];
  PerpsClosePositionModals: PerpsNavigationParamList['PerpsClosePositionModals'];
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsTooltip: undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsPositionTransaction: PerpsNavigationParamList['PerpsPositionTransaction'];
  PerpsOrderTransaction: PerpsNavigationParamList['PerpsOrderTransaction'];
  PerpsFundingTransaction: PerpsNavigationParamList['PerpsFundingTransaction'];

  // Predict routes — `Predict` is a nested stack navigator.
  Predict: NestedNavigationParams | undefined;
  PredictMarketList: PredictMarketListRouteParams | undefined;
  PredictFeed: PredictFeedRouteParams | undefined;
  PredictMarketDetails: PredictMarketDetailsParams | undefined;
  PredictPositions: PredictPositionsParams | undefined;
  PredictWorldCup: PredictWorldCupParams | undefined;
  PredictActivityDetail: PredictActivityDetailParams;
  PredictModals: undefined;
  PredictBuyPreview: PredictBuyPreviewParams;
  PredictSellPreview: PredictSellPreviewParams;
  PredictUnavailable: undefined;
  PredictAddFundsSheet: undefined;
  PredictGTMModal: undefined;

  // Social Leaderboard routes
  TopTradersView:
    | {
        /** Analytics entry-point that opened the leaderboard. Narrowed at the
         * receiver to LeaderboardScreenViewedSource. */
        source?: string;
      }
    | undefined;
  TraderProfileView: {
    traderId: string;
    traderName: string;
    /** Wallet address (LeaderboardEntry.addresses[0]); used as analytics key. */
    traderAddress?: string;
    /** Analytics entry-point that opened the profile. Narrowed at the
     * receiver to TraderProfileScreenViewedSource. */
    source?: string;
    /** Leaderboard rank when arriving from leaderboard / home carousel. */
    traderRank?: number;
  };
  TraderPositionView: TraderPositionViewParams;

  // Misc routes
  LockScreen: undefined;
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithNetworkModal: undefined;
  SmartAccountOptIn: undefined;

  // Notification routes
  NotificationsView: undefined;
  NotificationsDetails: NotificationDetailsParams | undefined;

  // Staking routes
  Stake: StakeParams | undefined;
  StakeConfirmation: StakeConfirmationParams | undefined;
  Unstake: UnstakeParams | undefined;
  UnstakeConfirmation: UnstakeConfirmationParams | undefined;
  EarningsHistory: { asset: TokenI };
  Claim: ClaimParams | undefined;
  LearnMore: LearnMoreModalParams | undefined;
  TrxLearnMore: undefined;
  MaxInput: MaxInputModalParams;
  GasImpact: GasImpactModalParams;
  EarnTokenList: EarnTokenListViewRouteParams | undefined;

  // Earn routes
  EarnScreens: EarnScreensParams | undefined;
  EarnLendingDepositConfirmation: LendingDepositConfirmationParams | undefined;
  EarnLendingWithdrawalConfirmation:
    | LendingWithdrawalConfirmationParams
    | undefined;
  EarnMusdConversionEducation:
    | EarnMusdConversionEducationViewRouteParams
    | undefined;
  EarnModals: NestedNavigationParams | undefined;
  EarnLendingMaxWithdrawalModal: LendingMaxWithdrawalModalParams | undefined;
  EarnLendingLearnMoreModal: undefined;

  // Full screen confirmation routes
  RedesignedConfirmations: undefined;
  NoHeaderConfirmations: undefined;

  // Identity routes
  TurnOnBackupAndSync: undefined;

  // Multi SRP routes
  ImportSRPView: undefined;

  // Multichain accounts routes
  MultichainAccountDetails: MultichainAccountDetailsParams | undefined;
  MultichainAccountGroupDetails:
    | MultichainAccountGroupDetailsParams
    | undefined;
  MultichainWalletDetails: MultichainWalletDetailsParams | undefined;
  MultichainAddressList: MultichainAddressListParams | undefined;
  MultichainPrivateKeyList: PrivateKeyListParams | undefined;

  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  // Snaps routes
  SnapsSettingsList: undefined;
  SnapSettings: SnapSettingsParams | undefined;
  ///: END:ONLY_INCLUDE_IF

  // Misc routes
  FoxLoader: FoxLoaderParams | undefined;
  SetPasswordFlow: NestedNavigationParams | undefined;
  EditAccountName: EditAccountNameParams | undefined;

  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  // Sample feature
  SampleFeature: undefined;
  ///: END:ONLY_INCLUDE_IF

  // Card routes
  CardScreens: undefined;
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: { showAuthPrompt?: boolean } | undefined;
  CardSpendingLimit: { flow: string } | undefined;
  ChooseYourCard:
    | { flow: string; shippingAddress?: ShippingAddress }
    | undefined;
  CardCashback: undefined;
  ReviewOrder: undefined;
  OrderCompleted:
    | {
        paymentMethod?: string;
        transactionHash?: string;
        fromUpgrade?: boolean;
      }
    | undefined;
  CardOnboarding: undefined;
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail: undefined;
  CardOnboardingSetPhoneNumber: undefined;
  CardOnboardingConfirmPhoneNumber: undefined;
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingVerifyingVeriffKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingKYCPending: undefined;
  CardModals: NestedNavigationParams | undefined;
  CardAddFundsModal: undefined;
  CardAssetSelectionModal: undefined;
  CardRegionSelectionModal: undefined;
  CardConfirmModal: CardConfirmModalParams | undefined;
  CardPasswordModal: undefined;
  CardRecurringFeeModal: undefined;
  CardDaimoPayModal: undefined;
  CardViewPinModal: { imageUrl: string };
  CardSpendingLimitOptionsModal: {
    currentLimitType: 'full' | 'restricted';
    currentCustomLimit: string;
    callerRoute: string;
    callerParams?: Record<string, unknown>;
  };
  CardWaitlistFormModal: { url: string };
  CardForgotPasswordModal: { location?: 'us' | 'international' } | undefined;

  // Send routes
  Recipient: SendRecipientParams | undefined;
  Asset: AssetViewParams | SendAssetParams | undefined;
  Send: NestedNavigationParams | SendParams | undefined;

  // Add asset routes
  AddAsset: AddAssetParams | undefined;
  ConfirmAddAsset: ConfirmAddAssetParams | undefined;

  // Asset detail stack routes (nested under the `Asset` navigator)
  AssetStackFlow: NestedNavigationParams | undefined;
  SecurityTrust: TokenDetailsRouteParams & {
    isPricePositive?: boolean;
    useAmbientColor?: boolean;
  };
  CreatePriceAlert: CreatePriceAlertRouteParams;
  ManagePriceAlerts: PriceAlertRouteParams;

  // NFT detail routes
  NftDetails: NftDetailsParams;
  NftDetailsFullImage: NftDetailsParams;

  // SDK routes
  ReturnToDappToast: ReturnToDappNotificationParams | undefined;

  // Feature flag route
  FeatureFlagOverride: undefined;
};

// NOTE: The global ReactNavigation.RootParamList is intentionally kept LOOSE
// (extends ParamListBase) during the incremental migration to strict navigation
// typing. This keeps untyped `useNavigation()` call sites compiling while we
// migrate them, feature-by-feature, to `useNavigation<AppNavigationProp>()`.
// Once every call site is migrated and `RootStackParamList` is complete, this
// should be flipped to `extends RootStackParamList` to enforce strict route
// names globally.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends ParamListBase {}
  }
}

/**
 * Strict navigation prop for the app's root stack.
 *
 * Opt in via `useNavigation<AppNavigationProp>()` to get route-name and param
 * type checking + autocomplete against `RootStackParamList`. This deliberately
 * references `RootStackParamList` directly (not the loose global) so callers get
 * strict checking even while the global remains permissive during migration.
 *
 * `getState()` is widened to allow `undefined` (navigator not yet mounted) and
 * uses the unparameterized `NavigationState` to match @react-navigation/core.
 */
export type AppNavigationProp = Omit<
  NavigationProp<RootStackParamList>,
  'getState'
> & {
  getState(): NavigationState | undefined;
};

/**
 * Use when calling stack-only APIs (`replace`, `push`, `pop`, `popToTop`).
 * Mirrors {@link AppNavigationProp}'s `getState()` override, which accounts for
 * `getState()` potentially returning undefined when the navigator is not mounted.
 */
export type AppStackNavigationProp = Omit<
  NativeStackNavigationProp<ReactNavigation.RootParamList>,
  'getState'
> & {
  getState(): NavigationState<ReactNavigation.RootParamList> | undefined;
};
