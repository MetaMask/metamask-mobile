import { ParamListBase } from '@react-navigation/native';

// ============================================================================
// Import types from their source files
// ============================================================================

// Ledger modal params
import type { LedgerMessageSignModalParams } from '../../components/UI/LedgerModals/LedgerMessageSignModal';
import type { LedgerTransactionModalParams } from '../../components/UI/LedgerModals/LedgerTransactionModal';

// Browser params
import type { BrowserParams } from '../../components/Views/Browser/Browser.types';

import type { BridgeRouteParams } from '../../components/UI/Bridge/Views/BridgeView';
import type { BridgeTokenSelectorRouteParams } from '../../components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import type { DefaultSlippageModalParams } from '../../components/UI/Bridge/components/SlippageModal/types';

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
import type { AccountConnectParams } from '../../components/Views/AccountConnect/AccountConnect.types';
import type { ShowTokenIdSheetParams } from '../../components/Views/ShowTokenIdSheet/ShowTokenIdSheet.types';
import type { ShowIpfsGatewaySheetParams } from '../../components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.types';

// Modal params
import type { DeepLinkModalParams } from '../../components/UI/DeepLinkModal/types';
import type { OptinMetricsRouteParams } from '../../components/UI/OptinMetrics/OptinMetrics.types';

// Perps navigation params
import type { PerpsNavigationParamList } from '../../components/UI/Perps/types/navigation';

// ============================================================================
// Types unique to NavigationService (not defined elsewhere)
// ============================================================================

/** Ramp buy/sell parameters */
export interface RampBuySellParams {
  showBack?: boolean;
}

/** Ramp order details parameters */
export interface RampOrderDetailsParams {
  orderId?: string;
  redirectToOrders?: boolean;
}

/** Deposit navigation parameters */
export interface DepositNavigationParams {
  animationEnabled?: boolean;
}

/** Deposit build quote parameters */
export interface DepositBuildQuoteParams {
  animationEnabled?: boolean;
}

/** Webview modal parameters */
export interface WebviewModalParams {
  url?: string;
  title?: string;
}

/** Options sheet parameters */
export interface OptionsSheetParams {
  options?: {
    label: string;
    onPress: () => void;
    icon?: string;
  }[];
}

/** QR Scanner parameters */
export interface QRScannerParams {
  onScanSuccess?: (data: string) => void;
  onScanError?: (error: Error) => void;
  origin?: string;
}

/** Transactions view parameters */
export interface TransactionsViewParams {
  redirectToOrders?: boolean;
  redirectToPerpsTransactions?: boolean;
}

/** Transaction details parameters */
export interface TransactionDetailsParams {
  transactionId?: string;
}

/** Root modal flow parameters */
export interface RootModalFlowParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Modal confirmation parameters */
export interface ModalConfirmationParams {
  title?: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Modal mandatory parameters */
export interface ModalMandatoryParams {
  title?: string;
  description?: string;
  ctaText?: string;
  onCta?: () => void;
}

/** SRP reveal quiz parameters */
export interface SRPRevealQuizParams {
  onQuizComplete?: () => void;
}

/** Multichain account detail actions parameters */
export interface MultichainAccountDetailActionsParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Manual backup step 3 parameters */
export interface ManualBackupStep3Params {
  words: string[];
  steps: string[];
  backupFlow: boolean;
}

/** Send flow parameters */
export interface SendFlowParams {
  txMeta?: Record<string, unknown>;
}

/** Send amount parameters */
export interface SendAmountParams {
  txMeta?: Record<string, unknown>;
  selectedAsset?: Record<string, unknown>;
}

/** Send confirm parameters */
export interface SendConfirmParams {
  txMeta?: Record<string, unknown>;
}

/** Account backup parameters */
export interface AccountBackupParams {
  words?: string[];
}

/** Contact form parameters */
export interface ContactFormParams {
  mode?: 'add' | 'edit';
  address?: string;
  name?: string;
  onUpdate?: () => void;
}

/** Reveal private credential parameters */
export interface RevealPrivateCredentialParams {
  credentialName?: 'seed_phrase' | 'private_key';
  shouldUpdateNav?: boolean;
  selectedAddress?: string;
}

/** Region selector parameters */
export interface RegionSelectorParams {
  onSelect?: (regionId: string) => void;
}

/** Add account parameters */
export interface AddAccountParams {
  onAccountCreated?: (address: string) => void;
}

/** Ambiguous address parameters */
export interface AmbiguousAddressParams {
  addresses?: string[];
  onSelect?: (address: string) => void;
}

/** SDK loading parameters */
export interface SDKLoadingParams {
  channelId?: string;
}

/** SDK feedback parameters */
export interface SDKFeedbackParams {
  channelId?: string;
}

/** SDK disconnect parameters */
export interface SDKDisconnectParams {
  channelId?: string;
}

/** Account permissions parameters */
export interface AccountPermissionsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

/** Revoke all account permissions parameters */
export interface RevokeAllAccountPermissionsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

/** Connection details parameters */
export interface ConnectionDetailsParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
}

/** Network selector parameters */
export interface NetworkSelectorParams {
  onNetworkSelected?: (chainId: string) => void;
}

/** Account actions parameters */
export interface AccountActionsParams {
  selectedAddress?: string;
}

/** Show NFT display media parameters */
export interface ShowNftDisplayMediaParams {
  uri?: string;
}

/** Origin spam modal parameters */
export interface OriginSpamModalParams {
  origin?: string;
}

/** Select SRP parameters */
export interface SelectSRPParams {
  onSelect?: (keyringId: string) => void;
}

/** Seedphrase modal parameters */
export interface SeedphraseModalParams {
  seedPhrase?: string[];
}

/** Success/Error sheet parameters */
export interface SuccessErrorSheetParams {
  title?: string;
  description?: string;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  onPrimaryButtonPress?: () => void;
  onSecondaryButtonPress?: () => void;
  type?: 'success' | 'error';
}

/** Multichain transaction details parameters */
export interface MultichainTransactionDetailsParams {
  transactionId?: string;
}

/** Transaction details sheet parameters */
export interface TransactionDetailsSheetParams {
  transactionId?: string;
}

/** Multichain account actions parameters */
export interface MultichainAccountActionsParams {
  address?: string;
  accountId?: string;
}

/** Edit account name parameters */
export interface EditAccountNameParams {
  address?: string;
  accountId?: string;
}

/** Edit wallet name parameters */
export interface EditWalletNameParams {
  keyringId?: string;
}

/** Share address parameters */
export interface ShareAddressParams {
  address?: string;
}

/** Share address QR parameters */
export interface ShareAddressQRParams {
  address?: string;
  networkName?: string;
  chainId?: string;
  groupId?: string;
}

/** Delete account parameters */
export interface DeleteAccountParams {
  address?: string;
  accountId?: string;
}

/** Reveal SRP credential parameters */
export interface RevealSRPCredentialParams {
  keyringId?: string;
}

/** Smart account parameters */
export interface SmartAccountParams {
  address?: string;
}

/** Asset loader parameters */
export interface AssetLoaderParams {
  address?: string;
  chainId?: string;
}

/** Asset view parameters */
export interface AssetViewParams {
  address?: string;
  chainId?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  image?: string;
  pricePercentChange1d?: number;
  isFromTrending?: boolean;
}

/** Webview parameters */
export interface WebviewParams {
  screen?: string;
  params?: {
    url?: string;
    title?: string;
  };
}

/** Simple webview parameters */
export interface SimpleWebviewParams {
  url?: string;
  title?: string;
}

/** Add network parameters */
export interface AddNetworkParams {
  shouldNetworkSwitchPopToWallet?: boolean;
  shouldShowPopularNetworks?: boolean;
  network?: string;
}

/** Edit network parameters */
export interface EditNetworkParams {
  network?: string;
  shouldNetworkSwitchPopToWallet?: boolean;
  shouldShowPopularNetworks?: boolean;
}

/** Custom slippage modal parameters */
export interface CustomSlippageModalParams {
  currentSlippage?: number;
  onSlippageChange?: (slippage: number) => void;
}

/** Transaction details block explorer parameters */
export interface TransactionDetailsBlockExplorerParams {
  url?: string;
}

/** Blockaid modal parameters */
export interface BlockaidModalParams {
  securityAlertResponse?: Record<string, unknown>;
}

/** Bridge transaction details parameters */
export interface BridgeTransactionDetailsParams {
  bridgeTxId?: string;
}

/** Predict market list parameters */
export interface PredictMarketListParams {
  entryPoint?: string;
}

/** Predict market details parameters */
export interface PredictMarketDetailsParams {
  marketId?: string;
  entryPoint?: string;
  title?: string;
  image?: string;
  isGame?: boolean;
  providerId?: string;
}

/** Predict activity detail parameters */
export interface PredictActivityDetailParams {
  activity: Record<string, unknown>;
}

/** Predict buy preview parameters */
export interface PredictBuyPreviewParams {
  market: Record<string, unknown>;
  outcome: Record<string, unknown>;
  outcomeToken: Record<string, unknown>;
  entryPoint?: string;
}

/** Predict sell preview parameters */
export interface PredictSellPreviewParams {
  market: Record<string, unknown>;
  position: Record<string, unknown>;
  outcome: Record<string, unknown>;
  entryPoint?: string;
}

/** Notification details parameters */
export interface NotificationDetailsParams {
  notificationId?: string;
}

/** Stake parameters */
export interface StakeParams {
  token?: {
    chainId?: string;
    address?: string;
    symbol?: string;
    decimals?: number;
    name?: string;
    image?: string;
    balance?: string;
    balanceFiat?: string;
    isETH?: boolean;
  };
}

/** Stake confirmation parameters */
export interface StakeConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
  annualRewardsETH?: string;
  annualRewardsFiat?: string;
  annualRewardRate?: string;
  chainId?: string;
}

/** Unstake parameters */
export interface UnstakeParams {
  token?: Record<string, unknown>;
}

/** Unstake confirmation parameters */
export interface UnstakeConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
}

/** Claim parameters */
export interface ClaimParams {
  token?: Record<string, unknown>;
}

/** Learn more modal parameters */
export interface LearnMoreModalParams {
  title?: string;
  content?: string;
}

/** Max input modal parameters */
export interface MaxInputModalParams {
  amountWei?: string;
  amountFiat?: string;
  annualRewardsETH?: string;
  annualRewardsFiat?: string;
  annualRewardRate?: string;
  estimatedGasFee?: string;
  estimatedGasFeePercentage?: string;
  handleMaxPress?: () => void;
}

/** Gas impact modal parameters */
export interface GasImpactModalParams {
  estimatedGasFee?: string;
  estimatedGasFeePercentage?: string;
}

/** Earn screens parameters */
export interface EarnScreensParams {
  screen?: string;
  params?: {
    token?: Record<string, unknown>;
  };
}

/** Lending confirmation parameters */
export interface LendingConfirmationParams {
  amountWei?: string;
  amountFiat?: string;
}

/** Lending max withdrawal modal parameters */
export interface LendingMaxWithdrawalModalParams {
  maxAmount?: string;
  onMaxPress?: () => void;
}

/** Multichain account details parameters */
export interface MultichainAccountDetailsParams {
  address?: string;
  accountId?: string;
}

/** Multichain account group details parameters */
export interface MultichainAccountGroupDetailsParams {
  groupId?: string;
}

/** Multichain wallet details parameters */
export interface MultichainWalletDetailsParams {
  keyringId?: string;
}

/** Multichain address list parameters */
export interface MultichainAddressListParams {
  accountId?: string;
}

/** Multichain private key list parameters */
export interface MultichainPrivateKeyListParams {
  accountId?: string;
}

/** Snap settings parameters */
export interface SnapSettingsParams {
  snapId?: string;
}

/** Fox loader parameters */
export interface FoxLoaderParams {
  loadingText?: string;
}

/** Card onboarding webview parameters */
export interface CardOnboardingWebviewParams {
  url?: string;
  title?: string;
}

/** Card confirm modal parameters */
export interface CardConfirmModalParams {
  title?: string;
  message?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Send recipient parameters */
export interface SendRecipientParams {
  txMeta?: Record<string, unknown>;
}

/** Send asset parameters */
export interface SendAssetParams {
  txMeta?: Record<string, unknown>;
}

/** Send parameters */
export interface SendParams {
  txMeta?: Record<string, unknown>;
  isFromTabBar?: boolean;
}

/** Return to dapp notification parameters */
export interface ReturnToDappNotificationParams {
  dappName?: string;
  dappUrl?: string;
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Helper type to get params for a specific route
 */
export type GetRouteParams<T extends keyof RouteParams> = RouteParams[T];

/**
 * Unified route params type - combines all param types
 */
export interface RouteParams {
  BrowserParams: BrowserParams;
  BridgeRouteParams: BridgeRouteParams;
  BridgeTokenSelectorRouteParams: BridgeTokenSelectorRouteParams;
}

/**
 * Flattened param list for React Navigation compatibility.
 * Maps actual route name strings to their parameter types.
 * This provides TypeScript autocomplete and error checking for navigation.
 */
export interface RootStackParamList extends ParamListBase {
  // Top-level routes
  WalletView: undefined;
  BrowserTabHome: BrowserParams | undefined;
  BrowserView: BrowserParams | undefined;
  SettingsView: undefined;
  DeprecatedNetworkDetails: undefined;

  // Ramp routes
  Ramp: undefined;
  RampBuy: RampBuySellParams | undefined;
  RampSell: RampBuySellParams | undefined;
  RampTokenSelection: undefined;
  GetStarted: undefined;
  BuildQuote: DepositBuildQuoteParams | undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: undefined;
  Checkout: undefined;
  OrderDetails: RampOrderDetailsParams | undefined;
  SendTransaction: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RampAmountInput: undefined;
  RampModals: undefined;
  RampTokenSelectorModal: undefined;
  RampFiatSelectorModal: undefined;
  RampIncompatibleAccountTokenModal: undefined;
  RampRegionSelectorModal: undefined;
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
  EnterAddress: undefined;
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
  DepositKycWebviewModal: WebviewModalParams | undefined;
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
  QRScanner: QRScannerParams | undefined;
  TransactionsView: TransactionsViewParams | undefined;
  TransactionDetails: TransactionDetailsParams | undefined;
  RewardsView: undefined;
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsDashboard: undefined;
  TrendingView: undefined;
  TrendingFeed: undefined;
  SitesFullView: undefined;
  ExploreSearch: undefined;
  RewardsOnboardingFlow: undefined;
  RewardsOnboardingIntro: undefined;
  RewardsOnboarding1: undefined;
  RewardsOnboarding2: undefined;
  RewardsOnboarding3: undefined;
  RewardsOnboarding4: undefined;

  // Modal routes
  DeleteWalletModal: undefined;
  RootModalFlow: RootModalFlowParams | undefined;
  ModalConfirmation: ModalConfirmationParams | undefined;
  ModalMandatory: ModalMandatoryParams | undefined;
  WhatsNewModal: undefined;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  DetectedTokens: undefined;
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
  Onboarding: undefined;
  Login: undefined;
  OnboardingNav: undefined;
  SocialLoginSuccessNewUser: undefined;
  ManualBackupStep1: ManualBackupStep1Params | undefined;
  ManualBackupStep2: ManualBackupStep2Params | undefined;
  ManualBackupStep3: ManualBackupStep3Params | undefined;
  ImportFromSecretRecoveryPhrase: undefined;
  ChoosePassword: ChoosePasswordRouteParams | undefined;
  OptinMetrics: OptinMetricsRouteParams | undefined;
  SocialLoginSuccessExistingUser: undefined;
  Rehydrate: undefined;

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
  ResetNotifications: undefined;
  SDKLoading: SDKLoadingParams | undefined;
  SDKFeedback: SDKFeedbackParams | undefined;
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
  AccountActions: AccountActionsParams | undefined;
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
  OnboardingSheet: undefined;
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
  Webview: WebviewParams | undefined;
  SimpleWebview: SimpleWebviewParams | undefined;

  // Wallet routes
  WalletTabHome: undefined;
  WalletTabStackFlow: undefined;
  WalletConnectSessionsView: undefined;
  NftFullView: undefined;
  TokensFullView: undefined;
  TrendingTokensFullView: undefined;

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
  BridgeModals: undefined;
  DefaultSlippageModal: DefaultSlippageModalParams | undefined;
  CustomSlippageModal: CustomSlippageModalParams | undefined;
  TransactionDetailsBlockExplorer:
    | TransactionDetailsBlockExplorerParams
    | undefined;
  QuoteExpiredModal: undefined;
  BlockaidModal: BlockaidModalParams | undefined;
  RecipientSelectorModal: undefined;
  BridgeTransactionDetails: BridgeTransactionDetailsParams | undefined;

  // Perps routes - use PerpsNavigationParamList for type-safe perps navigation
  Perps: PerpsNavigationParamList['Perps'];
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
  PerpsModals: undefined;
  PerpsClosePositionModals: undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsTooltip: undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsPositionTransaction: PerpsNavigationParamList['PerpsPositionTransaction'];
  PerpsOrderTransaction: PerpsNavigationParamList['PerpsOrderTransaction'];
  PerpsFundingTransaction: PerpsNavigationParamList['PerpsFundingTransaction'];

  // Predict routes
  Predict: undefined;
  PredictMarketList: PredictMarketListParams | undefined;
  PredictMarketDetails: PredictMarketDetailsParams | undefined;
  PredictActivityDetail: PredictActivityDetailParams | undefined;
  PredictModals: undefined;
  PredictBuyPreview: PredictBuyPreviewParams | undefined;
  PredictSellPreview: PredictSellPreviewParams | undefined;
  PredictUnavailable: undefined;
  PredictAddFundsSheet: undefined;
  PredictGTMModal: undefined;

  // Misc routes
  LockScreen: undefined;
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithNetworkModal: undefined;
  SmartAccountOptIn: undefined;

  // Notification routes
  NotificationsView: undefined;
  OptIn: undefined;
  OptInStack: undefined;
  NotificationsDetails: NotificationDetailsParams | undefined;

  // Staking routes
  Stake: StakeParams | undefined;
  StakeConfirmation: StakeConfirmationParams | undefined;
  Unstake: UnstakeParams | undefined;
  UnstakeConfirmation: UnstakeConfirmationParams | undefined;
  EarningsHistory: undefined;
  Claim: ClaimParams | undefined;
  LearnMore: LearnMoreModalParams | undefined;
  TrxLearnMore: undefined;
  MaxInput: MaxInputModalParams | undefined;
  GasImpact: GasImpactModalParams | undefined;
  EarnTokenList: undefined;

  // Earn routes
  EarnScreens: EarnScreensParams | undefined;
  EarnLendingDepositConfirmation: LendingConfirmationParams | undefined;
  EarnLendingWithdrawalConfirmation: LendingConfirmationParams | undefined;
  EarnMusdConversionEducation: undefined;
  EarnModals: undefined;
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
  MultichainPrivateKeyList: MultichainPrivateKeyListParams | undefined;

  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  // Snaps routes
  SnapsSettingsList: undefined;
  SnapSettings: SnapSettingsParams | undefined;
  ///: END:ONLY_INCLUDE_IF

  // Misc routes
  FoxLoader: FoxLoaderParams | undefined;
  SetPasswordFlow: undefined;
  EditAccountName: EditAccountNameParams | undefined;

  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  // Sample feature
  SampleFeature: undefined;
  ///: END:ONLY_INCLUDE_IF

  // Card routes
  CardScreens: undefined;
  CardMainRoutes: undefined;
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: undefined;
  CardNotification: undefined;
  CardSpendingLimit: undefined;
  CardChangeAsset: undefined;
  VerifyingRegistration: undefined;
  ChooseYourCard: undefined;
  ReviewOrder: undefined;
  OrderCompleted: undefined;
  CardOnboarding: undefined;
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail: undefined;
  CardOnboardingSetPhoneNumber: undefined;
  CardOnboardingConfirmPhoneNumber: undefined;
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingVerifyingVeriffKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingMailingAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingKYCPending: undefined;
  CardOnboardingWebview: CardOnboardingWebviewParams | undefined;
  CardModals: undefined;
  CardAddFundsModal: undefined;
  CardAssetSelectionModal: undefined;
  CardRegionSelectionModal: undefined;
  CardConfirmModal: CardConfirmModalParams | undefined;
  CardPasswordModal: undefined;
  CardRecurringFeeModal: undefined;
  CardDaimoPayModal: undefined;

  // Send routes
  Recipient: SendRecipientParams | undefined;
  Asset: SendAssetParams | undefined;
  Send: SendParams | undefined;

  // SDK routes
  ReturnToDappToast: ReturnToDappNotificationParams | undefined;

  // Feature flag route
  FeatureFlagOverride: undefined;
}
