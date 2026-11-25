/**
 * Hand-maintained route-to-page-object coverage registry.
 *
 * Add every route value from Routes.ts to this registry. Use NOT_A_SCREEN for
 * navigator hosts, redirects, and non-screen route entries; use null when a
 * screen does not yet have a page object. Type-only page-object imports keep
 * route reporting lightweight while making renamed or deleted modules fail
 * TypeScript validation.
 */

import type AccountDetails from '../MultichainAccounts/AccountDetails';
import type ActivityDetails from '../Transactions/ActivityDetails';
import type ActivitiesView from '../Transactions/ActivitiesView';
import type AddDeviceToWalletView from '../Onboarding/AddDeviceToWalletView';
import type AddWalletView from '../Onboarding/AddWalletView';
import type AccountMenu from '../AccountMenu/AccountMenu';
import type Browser from '../Browser/BrowserView';
import type BuildQuoteView from '../Ramps/BuildQuoteView';
import type CardHomeView from '../Card/CardHomeView';
import type ChangePasswordView from '../Settings/SecurityAndPrivacy/ChangePasswordView';
import type DeeplinkModal from '../swaps/Deeplink';
import type DeleteAccount from '../MultichainAccounts/DeleteAccount';
import type DeleteWalletModal from '../Settings/SecurityAndPrivacy/DeleteWalletModal';
import type DeveloperOptionsView from '../Settings/DeveloperOptions/DeveloperOptionsView';
import type EditAccountName from '../MultichainAccounts/EditAccountName';
import type EditAccountNameView from '../wallet/EditAccountNameView';
import type FundActionMenu from '../UI/FundActionMenu';
import type ImportSrpView from '../importSrp/ImportSrpView';
import type ImportWalletView from '../Onboarding/ImportWalletView';
import type LoginView from '../wallet/LoginView';
import type ManageAccounts from '../MultichainAccounts/ManageAccounts';
import type ManualBackupStep1View from '../Onboarding/ManualBackupStep1View';
import type MarketInsightsView from '../wallet/MarketInsightsView';
import type MoneyAddMoneySheet from '../Money/MoneyAddMoneySheet';
import type MoneyHomeView from '../Money/MoneyHomeView';
import type MoneyTransferSheet from '../Money/MoneyTransferSheet';
import type NetworkListModal from '../Network/NetworkListModal';
import type NetworkManager from '../wallet/NetworkManager';
import type OnboardingCryptoExperienceQuestionnaireView from '../Onboarding/OnboardingCryptoExperienceQuestionnaireView';
import type OnboardingInterestQuestionnaireView from '../Onboarding/OnboardingInterestQuestionnaireView';
import type OnboardingSheet from '../Onboarding/OnboardingSheet';
import type OrderDetailsView from '../Ramps/OrderDetailsView';
import type AdvancedSettingsView from '../Settings/AdvancedView';
import type PerpsMarketDetailsView from '../Perps/PerpsMarketDetailsView';
import type PerpsMarketListView from '../Perps/PerpsMarketListView';
import type PerpsOrderDetailsView from '../Perps/PerpsOrderDetailsView';
import type PredictAddFunds from '../Predict/PredictAddFunds';
import type PredictFeedView from '../Predict/PredictFeedView';
import type PredictMarketList from '../Predict/PredictMarketList';
import type PredictPositions from '../Predict/PredictPositions';
import type PredictUnavailableView from '../Predict/PredictUnavailableView';
import type QuotesView from '../Ramps/QuotesView';
import type AddressList from '../MultichainAccounts/AddressList';
import type RemoveAccount from '../MultichainAccounts/RemoveAccount';
import type RewardsMoneyView from '../Rewards/RewardsMoneyView';
import type RewardsView from '../Rewards/RewardsView';
import type SettingsView from '../Settings/SettingsView';
import type ShareAddress from '../MultichainAccounts/ShareAddress';
import type SkipAccountSecurityModal from '../Onboarding/SkipAccountSecurityModal';
import type SmartAccount from '../MultichainAccounts/SmartAccount';
import type SnapSettingsView from '../Settings/SnapSettingsView';
import type SocialProfileOnboardingView from '../Social/SocialProfileOnboardingView';
import type SocialV1View from '../Social/SocialV1View';
import type StakeView from '../Stake/StakeView';
import type TokensFullView from '../wallet/HomeSections';
import type TransactionDetailsModal from '../Transactions/TransactionDetailsModal';
import type TrendingView from '../Trending/TrendingView';
import type WalletActionsBottomSheet from '../wallet/WalletActionsBottomSheet';
import type WalletDetails from '../MultichainAccounts/WalletDetails';
import type WalletView from '../wallet/WalletView';

/* eslint-disable @typescript-eslint/naming-convention */
interface PageObjectModules {
  AddressList: typeof AddressList;
  AccountDetails: typeof AccountDetails;
  ActivityDetails: typeof ActivityDetails;
  ActivitiesView: typeof ActivitiesView;
  AddDeviceToWalletView: typeof AddDeviceToWalletView;
  AddWalletView: typeof AddWalletView;
  AccountMenu: typeof AccountMenu;
  Browser: typeof Browser;
  BuildQuoteView: typeof BuildQuoteView;
  CardHomeView: typeof CardHomeView;
  ChangePasswordView: typeof ChangePasswordView;
  DeeplinkModal: typeof DeeplinkModal;
  DeleteAccount: typeof DeleteAccount;
  DeleteWalletModal: typeof DeleteWalletModal;
  DeveloperOptionsView: typeof DeveloperOptionsView;
  EditAccountName: typeof EditAccountName;
  EditAccountNameView: typeof EditAccountNameView;
  FundActionMenu: typeof FundActionMenu;
  ImportSrpView: typeof ImportSrpView;
  ImportWalletView: typeof ImportWalletView;
  LoginView: typeof LoginView;
  ManageAccounts: typeof ManageAccounts;
  ManualBackupStep1View: typeof ManualBackupStep1View;
  MarketInsightsView: typeof MarketInsightsView;
  MoneyAddMoneySheet: typeof MoneyAddMoneySheet;
  MoneyHomeView: typeof MoneyHomeView;
  MoneyTransferSheet: typeof MoneyTransferSheet;
  NetworkListModal: typeof NetworkListModal;
  NetworkManager: typeof NetworkManager;
  OnboardingCryptoExperienceQuestionnaireView: typeof OnboardingCryptoExperienceQuestionnaireView;
  OnboardingInterestQuestionnaireView: typeof OnboardingInterestQuestionnaireView;
  OnboardingSheet: typeof OnboardingSheet;
  OrderDetailsView: typeof OrderDetailsView;
  AdvancedSettingsView: typeof AdvancedSettingsView;
  PerpsMarketDetailsView: typeof PerpsMarketDetailsView;
  PerpsMarketListView: typeof PerpsMarketListView;
  PerpsOrderDetailsView: typeof PerpsOrderDetailsView;
  PredictAddFunds: typeof PredictAddFunds;
  PredictFeedView: typeof PredictFeedView;
  PredictMarketList: typeof PredictMarketList;
  PredictPositions: typeof PredictPositions;
  PredictUnavailableView: typeof PredictUnavailableView;
  QuotesView: typeof QuotesView;
  RemoveAccount: typeof RemoveAccount;
  RewardsMoneyView: typeof RewardsMoneyView;
  RewardsView: typeof RewardsView;
  SettingsView: typeof SettingsView;
  ShareAddress: typeof ShareAddress;
  SkipAccountSecurityModal: typeof SkipAccountSecurityModal;
  SmartAccount: typeof SmartAccount;
  SnapSettingsView: typeof SnapSettingsView;
  SocialProfileOnboardingView: typeof SocialProfileOnboardingView;
  SocialV1View: typeof SocialV1View;
  StakeView: typeof StakeView;
  TokensFullView: typeof TokensFullView;
  TransactionDetailsModal: typeof TransactionDetailsModal;
  TrendingView: typeof TrendingView;
  WalletActionsBottomSheet: typeof WalletActionsBottomSheet;
  WalletDetails: typeof WalletDetails;
  WalletView: typeof WalletView;
}
/* eslint-enable @typescript-eslint/naming-convention */

export type PageObject = keyof PageObjectModules;

export const NOT_A_SCREEN = 'not-a-screen' as const;

export type RoutePageObjectRegistry = Record<
  string,
  PageObject | typeof NOT_A_SCREEN | null
>;

const PAGE_OBJECT_ROUTES: Record<string, PageObject> = {
  MultichainAddressList: 'AddressList',
  AdvancedSettings: 'AdvancedSettingsView',
  EditAccountName: 'EditAccountNameView',
  ActivityDetails: 'ActivityDetails',
  TransactionsView: 'ActivitiesView',
  AddDeviceToWallet: 'AddDeviceToWalletView',
  AddWallet: 'AddWalletView',
  AccountsMenuView: 'AccountMenu',
  BrowserView: 'Browser',
  BuildQuote: 'BuildQuoteView',
  CardHome: 'CardHomeView',
  DeepLinkModal: 'DeeplinkModal',
  DeleteAccount: 'DeleteAccount',
  DeleteWalletModal: 'DeleteWalletModal',
  DeveloperOptions: 'DeveloperOptionsView',
  EditMultichainAccountName: 'EditAccountName',
  LegacyEditMultichainAccountName: 'EditAccountName',
  FundActionMenu: 'FundActionMenu',
  ImportSRPView: 'ImportSrpView',
  ImportFromSecretRecoveryPhrase: 'ImportWalletView',
  Login: 'LoginView',
  ManageAccountsView: 'ManageAccounts',
  ManualBackupStep1: 'ManualBackupStep1View',
  MarketInsightsView: 'MarketInsightsView',
  MoneyAddMoneySheet: 'MoneyAddMoneySheet',
  MoneyHome: 'MoneyHomeView',
  MoneyTransferSheet: 'MoneyTransferSheet',
  NetworkListModal: 'NetworkListModal',
  NetworkManager: 'NetworkManager',
  OnboardingCryptoExperienceQuestionnaire:
    'OnboardingCryptoExperienceQuestionnaireView',
  OnboardingInterestQuestionnaire: 'OnboardingInterestQuestionnaireView',
  OnboardingSheet: 'OnboardingSheet',
  PerpsActivity: 'ActivitiesView',
  PerpsMarketDetails: 'PerpsMarketDetailsView',
  PerpsMarketListView: 'PerpsMarketListView',
  PerpsOrderDetailsView: 'PerpsOrderDetailsView',
  PredictAddFundsSheet: 'PredictAddFunds',
  PredictFeed: 'PredictFeedView',
  PredictMarketList: 'PredictMarketList',
  PredictPositions: 'PredictPositions',
  PredictUnavailable: 'PredictUnavailableView',
  Quotes: 'QuotesView',
  RampsOrderDetails: 'OrderDetailsView',
  RemoveAccount: 'RemoveAccount',
  RewardsMoneyDashboard: 'RewardsMoneyView',
  ResetPassword: 'ChangePasswordView',
  RewardsView: 'RewardsView',
  Settings: 'SettingsView',
  ShareAddress: 'ShareAddress',
  SkipAccountSecurityModal: 'SkipAccountSecurityModal',
  SmartAccount: 'SmartAccount',
  SnapSettings: 'SnapSettingsView',
  SocialProfileOnboardingView: 'SocialProfileOnboardingView',
  SocialV1View: 'SocialV1View',
  Stake: 'StakeView',
  TokensFullView: 'TokensFullView',
  TransactionDetails: 'TransactionDetailsModal',
  TrendingView: 'TrendingView',
  MultichainAccountDetails: 'AccountDetails',
  MultichainWalletDetails: 'WalletDetails',
  WalletActions: 'WalletActionsBottomSheet',
  WalletView: 'WalletView',
};

const NO_PAGE_OBJECT_ROUTES =
  `  AccountActions AccountBackupStep1B AccountConnect AccountHubView AccountPermissions AccountSelector ActivityNetworkFilter
  ActivityPerpsFilter ActivityTypeFilter AddCustomToken AddDeviceVerificationCode AdditionalVerification AddNetwork AddressSelector
  AgenticCliApprovalConfirm AgenticCliDashboardConfirmation AmbiguousAddress Amount Asset AssetLoader AssetsSettings AssetView
  BackupAndSyncSettings BankDetails BasicFunctionality BasicFunctionalityMigration BasicInfo BatchSellCustomSlippageModal BatchSellDefaultSlippageModal BatchSellDestinationTokenSelectorModal
  BatchSellFinalReviewModal BatchSellMinimumReceivedInfoModal BatchSellNetworkFeeInfoModal BatchSellPriceImpactInfoModal BatchSellQuoteDetailsModal BatchSellReview BatchSellTokenSelect BenefitFullView
  BenefitsFullView BlockaidModal BridgeTokenSelector BridgeTransactionDetails BridgeView BuildQuoteHasStarted CancelLimitOrderModal
  CardAddFundsModal CardApplePayConfirmation CardApplePaySplash CardApplePayUsageSheet CardAssetSelectionModal CardAuthentication CardCashback CardConfirmModal
  CardConfirmPin CardContactDetails CardCreditBalanceTooltipModal CardCreditRedeem CardCreditRefundTooltipModal CardDaimoPayModal CardDigitalWalletInstructionsModal CardForgotPasswordModal
  CardMfaCode CardMfaMethod CardOnboardingComplete CardOnboardingConfirmEmail CardOnboardingConfirmPhoneNumber CardOnboardingFundingApproval CardOnboardingImmersveKYC CardOnboardingKYCFailed
  CardOnboardingKYCProcessing CardOnboardingPersonalDetails CardOnboardingPhysicalAddress CardOnboardingSetPhoneNumber CardOnboardingSignUp CardOnboardingVerifyIdentity CardOnboardingVerifyingVeriffKYC CardPasswordModal
  CardRecurringFeeModal CardRegionSelectionModal CardReportTransaction CardRevokeAllowanceSheet CardSetPin CardSignInHelpModal CardSpendingLimit CardSpendingLimitOptionsModal
  CardTransactionDetails CardTransactionHistory CardUkMigrationModal CardUnlinkMoneyAccountSheet CardViewPinModal CardWaitlistFormModal CardWelcome CashTokensFullView
  ChangeInSimulationModal Checkout ChoosePassword ChooseYourCard Claim CompanySettings Confirm ConfirmationPayWithBottomSheet
  ConfirmationPayWithModal ConfirmationPayWithNetworkModal ConfirmationRequestModal ConfirmationSwitchAccountType ConfirmTurnOnBackupAndSync ConnectHardwareWalletFlow ConnectionDetails ConnectLedgerFlow
  ConnectQRHardwareFlow ContactForm ContactsSettings ContractSecurity CreatePriceAlert DataCollection DefaultSettings DeFiFullView
  DepositConfigurationModal DepositErrorDetailsModal DepositKycWebviewModal DepositOrderDetails DepositPaymentMethodSelectorModal DepositRegionSelectorModal DepositStateSelectorModal DepositTokenSelectorModal
  DepositUnsupportedRegionModal DepositUnsupportedStateModal DepositWebviewModal DeprecatedNetworkDetails EarningsHistory EarnLendingDepositConfirmation EarnLendingLearnMoreModal EarnLendingMaxWithdrawalModal
  EarnLendingWithdrawalConfirmation EarnMusdConversionEducation EarnSearchList EarnStrategySelectionModal EarnTokenList EditNetwork EditProfileAvatarView
  EditWalletName EligibilityFailedModal EndOfSeasonClaimBottomSheet EnterAddress EnterEmail ExperienceEnhancer ExperimentalSettings ExploreSearch
  FeatureFlagOverride FeatureNotificationsGate FollowConnectionsView FoxLoader GasImpact GeneralSettings GetStarted HardwareWalletsSwaps
  HiddenTokens HighRateAlertModal HwQrScanner ImportPrivateKeyView ImportWalletTipSheet IncompatibleAccountTokenModal KycProcessing
  LearnMore LedgerConnect LedgerMessageSignModal LedgerTransactionModal LimitOrderAccountUpgradeFeeInfoModal LimitOrderConfirmationModal LimitOrderCostToleranceInfoModal
  LimitOrderMetaMaskFeeInfoModal LinkedSocialAccount ManagePriceAlerts ManageProfile ManageProfileField ManageProfileLinkedAccountView ManageProfileTextEditorView ManageProfileTradingActivityView
  ManageProfileView ManageProfileXAccount ManualBackupStep2 ManualBackupStep3 MAPicker MarketClosedModal MaxBrowserTabsModal MaxInput
  MfaFlow MfaMethodDetails MfaPasskeys MfaSettings MissingPriceModal ModalConfirmation ModalMandatory MoneyAccountStatus
  MoneyActivity MoneyApyInfoSheet MoneyBalanceInfoSheet MoneyCardTransactionDetails MoneyConfirmations MoneyDeeplinkModal MoneyDepositDeeplink MoneyEarnCryptoInfoSheet
  MoneyEarnings MoneyEarningsInfoSheet MoneyEstimatedBalanceSheet MoneyFirstTimeDeposit MoneyGeoBlockSheet MoneyHowItWorks MoneyLinkCardSheet MoneyMoreSheet MoneyMusdRescueRecipient MoneyMusdRescueSend
  MoneyPotentialEarnings MoneySplash MoneyTransactionDetails MoreTokenActionsMenu MultichainAccountActions MultichainAccountDetailActions MultichainAccountGroupDetails
  MultichainAccountsExplorerWebview MultichainAccountsIntroModal MultichainAccountsLearnMoreBottomSheet MultichainPrivateKeyList MultichainTransactionDetails MultiRPcMigrationModal
  MyProfileView NetworkDetails NetworkSelector NetworksManagement NFTAutoDetectionModal NftDetails NftFullView NoHeaderConfirmations
  NotificationsDetails NotificationSettingsSection NotificationsSettings NotificationsView Onboarding OnboardingOAuthRehydrate OnboardingSuccess OpenLimitOrderDetailsModal
  OptinMetrics OptionsSheet OrderCompleted OrderProcessing OriginSpamModal OTAUpdatesModal OtpCode PermittedNetworksInfoSheet
  OrderDetails PerpsAdjustMargin PerpsBalanceOrder PerpsCancelAllOrders PerpsCloseAllPositions PerpsClosePosition PerpsClosePositionModals PerpsCreatePriceAlert
  PerpsCrossMarginWarning PerpsFundingTransaction PerpsGTMModal PerpsHIP3Debug PerpsModeSelection PerpsOrderBook PerpsOrderRedirect PerpsOrderTransaction
  PerpsOutreachDetails PerpsPnlHeroCard PerpsPositions PerpsPositionTransaction PerpsPriceAlerts PerpsQuoteExpiredModal PerpsSelectAdjustMarginAction PerpsSelectModifyAction
  PerpsSelectOrderType PerpsSelectProvider PerpsSharePosition PerpsTooltip PerpsTPSL PerpsTradingView PerpsTrendingView PerpsTutorial
  PerpsWithdraw Pna25BottomSheet PostTradeModal PredictActivityDetail PredictBuyPreview PredictMarketDetails PredictMarketUnavailable PredictSellPreview
  PriceImpactModal ProfilesToFollowView ProHub ProHubCancelMembership ProHubEarned ProHubMembership ProSubscription QRScanner
  QRSigningTransactionModal QRTabSwitcher QuoteSelectorView RampActivationKeyForm RampAdditionalVerification RampAmountInput RampBankDetails RampBankDetailsStandalone
  RampBasicInfo RampBuildQuoteSettingsModal RampBuy RampEnterAddress RampEnterEmail RampErrorDetailsModal RampFiatSelectorModal RampHeadlessEntry
  RampHeadlessHost RampHeadlessPlayground RampIncompatibleAccountTokenModal RampKycProcessing RampKycWebview RampOrderProcessing RampOtpCode RampPaymentMethodSelectorModal
  RampPaymentSelectionModal RampPhoneCountrySelectorModal RampProcessingInfoModal RampProviderSelectionModal RampRegionSelectorModal RampSell RampSettings RampSettingsModal
  RampsServiceDisruptionModal RampSsnInfoModal RampStateSelectorModal RampTokenNotAvailableModal RampTokenSelection RampTokenSelectionRoot RampTokenSelectorModal
  RampUnsupportedRegionModal RampUnsupportedStateModal RampUnsupportedTokenModal RampVbaDetails RampVbaOnboarding RampVerifyIdentity Recipient RecipientSelectorModal
  RecurringConfirmOrderModal RecurringCustomPriceToleranceModal RecurringDefaultPriceToleranceModal RecurringDelegationFeeInfoModal RecurringIntervalModal RecurringOrderDetails RecurringPriceRangeModal RecurringRepeatInfoModal RecurringSwapDetails RedesignedConfirmations
  Rehydrate ResetPassword RestoreWallet ReturnToDappToast RevealPrivateCredential RevealPrivateCredentialView RevealSRPCredential ReviewOrder
  RevokeAllAccountPermissions RewardOptInAccountGroupModal RewardsBottomSheetModal RewardsCampaignDetails RewardsCampaignMechanics RewardsCampaignsView RewardsCampaignTourStep RewardsClaimBottomSheetModal
  RewardsDashboard RewardsEarningsHistoryView RewardsFlow RewardsInfoSheetModal RewardsMoneyAccountSweepstakesCampaignDetails RewardsMoneyAccountSweepstakesCampaignWinning RewardsMoneyClaimsPausedModal
  RewardsMoneyInviteSheet RewardsMoneyReferralAcceptedSplashView RewardsOndoCampaignLeaderboard RewardsOndoCampaignPortfolioView RewardsOndoCampaignStats RewardsOndoCampaignWinning RewardsOndoRwaAssetSelector
  RewardsPerpsTradingCampaignDetails RewardsPerpsTradingCampaignLeaderboard RewardsPerpsTradingCampaignStats RewardsPerpsTradingCampaignWinning RewardsPredictThePitchCampaignDetails RewardsPredictThePitchCampaignLeaderboard RewardsPredictThePitchCampaignPortfolioView RewardsPredictThePitchCampaignStats
  RewardsPredictThePitchCampaignWinning RewardsSeasonOneCampaignDetails RewardsSelectSheet RewardsSettingsView RewardsTaxContactSheet RewardsTaxFormView RewardsTaxOpenFormSheet RewardsTaxQuestionSheet
  RewardsTradingCommissionsView RewardsTradingRebatesView RewardsVipRefereeSplashView RewardsVipRefereeView RewardsVipSplashView RewardsVipTiersView RewardsVipTransactionsView RewardsVipView
  RWATokensFullView SampleFeature SDKConnectV2Otp SDKDisconnect SDKFeedback SDKLoading SDKManageConnections SDKSessionsManager
  SecurityBadgeBottomSheet SecuritySettings SecurityTrust SeedphraseModal SelectHardwareWallet SelectSRP Send SendTo
  SendTransaction SettingsAdvancedFiatOnTestnetsFriction SettingsRegionSelector ShareAddressQR ShowIpfs ShowNftDisplayMedia ShowTokenId SimpleWebview
  SitesFullView SnapsSettingsList SocialLeaderboardOnboarding SocialLeaderboardTab SocialPositionDetailsSheet SocialPostComposerView SocialTraderPreviewSheet SocialV0View
  SocialV1ProfileView SRPRevealQuiz SRPRevealQuizInMultichainAccountDetails SsnInfoModal StakeConfirmation SuccessErrorSheet SupportConsentSheet SwapCustomSlippageModal
  SwapDefaultSlippageModal SwapsLimitOrderActivity SwapsLimitOrderCustomCostToleranceModal SwapsLimitOrderDefaultCostToleranceModal SwapsLimitOrderExpirationModal TokenSort TokenWarningModal tooltipModal
  TraderPositionView TraderProfileView TradeWalletActions TradingSignalsSetupBottomSheet TransactionDetailsBlockExplorer TransactionDetailsSheet TrendingTokensFullView
  TrxLearnMore TurnOffRememberMeModal TurnOnBackupAndSync Unstake UnstakeConfirmation UnsupportedRegionModal UpdateNeededModal VerifyIdentity
  WalletConnectSessionsView WalletCreationError WalletResetNeeded WalletRestored WatchlistFullView Webview WhatsHappeningDetailView`
    .trim()
    .split(/\s+/);

const NOT_A_SCREEN_ROUTES =
  `  AgenticCliApproval AgenticCliDashboardWebview Bridge BridgeModals CardModals CardOnboarding CardScreens Deposit
  DepositModals DepositRoot EarnModals EarnScreens Home HomeNav Main MarketInsights
  MoneyModals MoneyScreens OnboardingNav OnboardingRootNav OnboardingSuccessFlow Perps PerpsModals Predict
  PredictModals Ramp RampModals RootModalFlow SetPasswordFlow SettingsView Social WalletTabHome BrowserTabHome
  WalletTabStackFlow`
    .trim()
    .split(/\s+/);

const noPageObjectEntries = Object.fromEntries(
  NO_PAGE_OBJECT_ROUTES.map((route) => [route, null]),
);
const notAScreenEntries = Object.fromEntries(
  NOT_A_SCREEN_ROUTES.map((route) => [route, NOT_A_SCREEN]),
);

export const ROUTE_PAGE_OBJECT_REGISTRY: RoutePageObjectRegistry = {
  ...noPageObjectEntries,
  ...notAScreenEntries,
  ...PAGE_OBJECT_ROUTES,
};
