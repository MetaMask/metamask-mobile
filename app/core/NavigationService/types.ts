import { ParamListBase } from '@react-navigation/native';

// ============================================================================
// Import types from their source files
// ============================================================================

// Ledger modal params
import type { LedgerMessageSignModalParams } from '../../components/UI/LedgerModals/LedgerMessageSignModal';
import type { LedgerTransactionModalParams } from '../../components/UI/LedgerModals/LedgerTransactionModal';

// Browser params
import type { BrowserParams } from '../../components/Views/Browser/Browser.types';

// Bridge params
import type { BridgeRouteParams } from '../../components/UI/Bridge/Views/BridgeView';
import type { BridgeTokenSelectorRouteParams } from '../../components/UI/Bridge/components/BridgeTokenSelector/BridgeTokenSelector';
import type { DefaultSlippageModalParams } from '../../components/UI/Bridge/components/SlippageModal/types';
import type {
  CustomSlippageModalParams,
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
import type { AccountConnectParams } from '../../components/Views/AccountConnect/AccountConnect.types';
import type { ShowTokenIdSheetParams } from '../../components/Views/ShowTokenIdSheet/ShowTokenIdSheet.types';
import type { ShowIpfsGatewaySheetParams } from '../../components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.types';
import type { SuccessErrorSheetParams } from '../../components/Views/SuccessErrorSheet/interface';

// Modal params
import type { DeepLinkModalParams } from '../../components/UI/DeepLinkModal/types';
import type { OptinMetricsRouteParams } from '../../components/UI/OptinMetrics/OptinMetrics.types';

// Perps navigation params
import type { PerpsNavigationParamList } from '../../components/UI/Perps/types/navigation';

// QR Scanner params
import type { QRScannerParams } from '../../components/Views/QRScanner/QRScanner.types';

// Ramp params
import type {
  RampBuySellParams,
  RampOrderDetailsParams,
  RampAggregatorBuildQuoteParams,
  DepositBuildQuoteParams,
  SimpleRampBuildQuoteParams,
  WebviewModalParams,
} from '../../components/UI/Ramp/Aggregator/types/navigation';
import type { DepositNavigationParams } from '../../components/UI/Ramp/Deposit/types/navigationParams';

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

// Stake params
import type {
  StakeParams,
  UnstakeParams,
  ClaimParams,
} from '../../components/UI/Stake/Views/StakeInputView/StakeInputView.types';

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
  PredictMarketListParams,
  PredictMarketDetailsParams,
  PredictActivityDetailParams,
  PredictBuyPreviewParams,
  PredictSellPreviewParams,
} from '../../components/UI/Predict/types/navigation';

// Contact form params
import type { ContactFormParams } from '../../components/Views/Settings/Contacts/ContactForm.types';

// SDK params
import type {
  SDKLoadingParams,
  SDKFeedbackParams,
  SDKDisconnectParams,
  ReturnToDappNotificationParams,
} from '../../components/Views/SDK/SDK.types';

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
import type {
  CardOnboardingWebviewParams,
  CardConfirmModalParams,
} from '../../components/UI/Card/Card.types';

// Account actions params
import type {
  AccountActionsParams,
  AccountPermissionsParams,
  RevokeAllAccountPermissionsParams,
  ConnectionDetailsParams,
  AddAccountParams,
  AmbiguousAddressParams,
} from '../../components/Views/AccountActions/AccountActions.types';

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
  MultichainPrivateKeyListParams,
} from '../../components/Views/MultichainAccounts/MultichainAccounts.types';

// Earn params
import type {
  StakeConfirmationParams,
  UnstakeConfirmationParams,
  LearnMoreModalParams,
  MaxInputModalParams,
  GasImpactModalParams,
  EarnScreensParams,
  LendingConfirmationParams,
  LendingMaxWithdrawalModalParams,
} from '../../components/UI/Earn/Earn.types';

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

// Webview params
import type {
  WebviewParams,
  SimpleWebviewParams,
} from '../../components/Views/Webview/Webview.types';

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
  /**
   * BuildQuote route is shared between:
   * - Ramp Aggregator: uses RampAggregatorBuildQuoteParams (showBack, assetId, amount, currency)
   * - Deposit: uses DepositBuildQuoteParams (shouldRouteImmediately)
   */
  BuildQuote:
    | RampAggregatorBuildQuoteParams
    | DepositBuildQuoteParams
    | undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: undefined;
  Checkout: undefined;
  OrderDetails: RampOrderDetailsParams | undefined;
  SendTransaction: undefined;
  RampSettings: undefined;
  RampActivationKeyForm: undefined;
  RampAmountInput: SimpleRampBuildQuoteParams | undefined;
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
  QRScanner: QRScannerParams;
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
  ManualBackupStep3: ManualBackupStep3Params;
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
  BlockaidModal: BlockaidModalParams;
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
  PredictActivityDetail: PredictActivityDetailParams;
  PredictModals: undefined;
  PredictBuyPreview: PredictBuyPreviewParams;
  PredictSellPreview: PredictSellPreviewParams;
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
  MaxInput: MaxInputModalParams;
  GasImpact: GasImpactModalParams;
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
