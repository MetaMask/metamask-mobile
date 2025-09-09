import type { RootParamList } from '../../util/navigation/types';

enum RouteNames {
  // Main Views
  WalletView = 'WalletView',
  BrowserTabHome = 'BrowserTabHome',
  BrowserView = 'BrowserView',
  SettingsView = 'SettingsView',
  DeprecatedNetworkDetails = 'DeprecatedNetworkDetails',

  // Ramp Routes
  Ramp = 'Ramp',
  RampBuy = 'RampBuy',
  RampSell = 'RampSell',
  GetStarted = 'GetStarted',
  BuildQuote = 'BuildQuote',
  BuildQuoteHasStarted = 'BuildQuoteHasStarted',
  Quotes = 'Quotes',
  Checkout = 'Checkout',
  Region = 'Region',
  RegionHasStarted = 'RegionHasStarted',
  BuyNetworkSwitcher = 'BuyNetworkSwitcher',
  OrderDetails = 'OrderDetails',
  SendTransaction = 'SendTransaction',
  RampSettings = 'RampSettings',
  RampActivationKeyForm = 'RampActivationKeyForm',

  // Deposit Routes
  Deposit = 'Deposit',
  DepositRoot = 'DepositRoot',
  EnterEmail = 'EnterEmail',
  OtpCode = 'OtpCode',
  VerifyIdentity = 'VerifyIdentity',
  BasicInfo = 'BasicInfo',
  EnterAddress = 'EnterAddress',
  KycProcessing = 'KycProcessing',
  OrderProcessing = 'OrderProcessing',
  DepositOrderDetails = 'DepositOrderDetails',
  BankDetails = 'BankDetails',
  AdditionalVerification = 'AdditionalVerification',
  DepositModals = 'DepositModals',
  DepositTokenSelectorModal = 'DepositTokenSelectorModal',
  DepositRegionSelectorModal = 'DepositRegionSelectorModal',
  DepositPaymentMethodSelectorModal = 'DepositPaymentMethodSelectorModal',
  DepositUnsupportedRegionModal = 'DepositUnsupportedRegionModal',
  DepositUnsupportedStateModal = 'DepositUnsupportedStateModal',
  DepositStateSelectorModal = 'DepositStateSelectorModal',
  DepositWebviewModal = 'DepositWebviewModal',
  DepositKycWebviewModal = 'DepositKycWebviewModal',
  IncompatibleAccountTokenModal = 'IncompatibleAccountTokenModal',
  SsnInfoModal = 'SsnInfoModal',
  DepositConfigurationModal = 'DepositConfigurationModal',

  // Hardware Wallet Routes
  ConnectHardwareWalletFlow = 'ConnectHardwareWalletFlow',
  SelectHardwareWallet = 'SelectHardwareWallet',
  ConnectQRHardwareFlow = 'ConnectQRHardwareFlow',
  ConnectLedgerFlow = 'ConnectLedgerFlow',
  LedgerConnect = 'LedgerConnect',
  LedgerMessageSignModal = 'LedgerMessageSignModal',
  LedgerTransactionModal = 'LedgerTransactionModal',

  // Common Routes
  QRTabSwitcher = 'QRTabSwitcher',
  OptionsSheet = 'OptionsSheet',
  QRScanner = 'QRScanner',
  TransactionsView = 'TransactionsView',
  TransactionDetails = 'TransactionDetails',

  // Modal Routes
  DeleteWalletModal = 'DeleteWalletModal',
  RootModalFlow = 'RootModalFlow',
  ModalConfirmation = 'ModalConfirmation',
  ModalMandatory = 'ModalMandatory',
  WhatsNewModal = 'WhatsNewModal',
  TurnOffRememberMeModal = 'TurnOffRememberMeModal',
  UpdateNeededModal = 'UpdateNeededModal',
  DetectedTokens = 'DetectedTokens',
  SRPRevealQuiz = 'SRPRevealQuiz',
  WalletActions = 'WalletActions',
  FundActionMenu = 'FundActionMenu',
  NFTAutoDetectionModal = 'NFTAutoDetectionModal',
  MultiRPcMigrationModal = 'MultiRPcMigrationModal',
  MaxBrowserTabsModal = 'MaxBrowserTabsModal',
  DeepLinkModal = 'DeepLinkModal',
  MultichainAccountDetailActions = 'MultichainAccountDetailActions',
  MultichainRevealPrivateCredential = 'MultichainRevealPrivateCredential',

  // Onboarding Routes
  OnboardingRootNav = 'OnboardingRootNav',
  OnboardingSuccessFlow = 'OnboardingSuccessFlow',
  OnboardingSuccess = 'OnboardingSuccess',
  DefaultSettings = 'DefaultSettings',
  GeneralSettings = 'GeneralSettings',
  AssetsSettings = 'AssetsSettings',
  SecuritySettings = 'SecuritySettings',
  HomeNav = 'HomeNav',
  Onboarding = 'Onboarding',
  Login = 'Login',
  OnboardingNav = 'OnboardingNav',
  ManualBackupStep1 = 'ManualBackupStep1',
  ManualBackupStep2 = 'ManualBackupStep2',
  ManualBackupStep3 = 'ManualBackupStep3',
  ImportFromSecretRecoveryPhrase = 'ImportFromSecretRecoveryPhrase',
  ChoosePassword = 'ChoosePassword',
  OptinMetrics = 'OptinMetrics',

  // Send Flow Routes
  SendTo = 'SendTo',
  Amount = 'Amount',
  Confirm = 'Confirm',

  // Account Backup Routes
  AccountBackupStep1B = 'AccountBackupStep1B',

  // Settings Routes
  AdvancedSettings = 'AdvancedSettings',
  ResetPassword = 'ResetPassword',
  ContactForm = 'ContactForm',
  DeveloperOptions = 'DeveloperOptions',
  ExperimentalSettings = 'ExperimentalSettings',
  NotificationsSettings = 'NotificationsSettings',
  RevealPrivateCredentialView = 'RevealPrivateCredentialView',
  SDKSessionsManager = 'SDKSessionsManager',
  BackupAndSyncSettings = 'BackupAndSyncSettings',

  // Sheet Routes
  AccountSelector = 'AccountSelector',
  AddressSelector = 'AddressSelector',
  AddAccount = 'AddAccount',
  AmbiguousAddress = 'AmbiguousAddress',
  BasicFunctionality = 'BasicFunctionality',
  ConfirmTurnOnBackupAndSync = 'ConfirmTurnOnBackupAndSync',
  ResetNotifications = 'ResetNotifications',
  SDKLoading = 'SDKLoading',
  SDKFeedback = 'SDKFeedback',
  DataCollection = 'DataCollection',
  ExperienceEnhancer = 'ExperienceEnhancer',
  SDKManageConnections = 'SDKManageConnections',
  SDKDisconnect = 'SDKDisconnect',
  AccountConnect = 'AccountConnect',
  AccountPermissions = 'AccountPermissions',
  RevokeAllAccountPermissions = 'RevokeAllAccountPermissions',
  ConnectionDetails = 'ConnectionDetails',
  PermittedNetworksInfoSheet = 'PermittedNetworksInfoSheet',
  NetworkSelector = 'NetworkSelector',
  ReturnToDappModal = 'ReturnToDappModal',
  AccountActions = 'AccountActions',
  SettingsAdvancedFiatOnTestnetsFriction = 'SettingsAdvancedFiatOnTestnetsFriction',
  ShowIpfs = 'ShowIpfs',
  ShowNftDisplayMedia = 'ShowNftDisplayMedia',
  ShowTokenId = 'ShowTokenId',
  OriginSpamModal = 'OriginSpamModal',
  TooltipModal = 'TooltipModal',
  TokenSort = 'TokenSort',
  TokenFilter = 'TokenFilter',
  NetworkManager = 'NetworkManager',
  ChangeInSimulationModal = 'ChangeInSimulationModal',
  SelectSRP = 'SelectSRP',
  OnboardingSheet = 'OnboardingSheet',
  SeedphraseModal = 'SeedphraseModal',
  SkipAccountSecurityModal = 'SkipAccountSecurityModal',
  SuccessErrorSheet = 'SuccessErrorSheet',
  MultichainEditAccountName = 'MultichainEditAccountName',
  EditWalletName = 'EditWalletName',
  ShareAddress = 'ShareAddress',
  ShareAddressQR = 'ShareAddressQR',
  DeleteAccount = 'DeleteAccount',
  RevealSRPCredential = 'RevealSRPCredential',
  SRPRevealQuizInMultichainAccountDetails = 'SRPRevealQuizInMultichainAccountDetails',
  SmartAccount = 'SmartAccount',

  // Browser Routes
  AssetLoader = 'AssetLoader',
  AssetView = 'AssetView',

  // Webview Routes
  Webview = 'Webview',
  SimpleWebview = 'SimpleWebview',

  // Wallet Routes
  WalletTabHome = 'WalletTabHome',
  WalletTabStackFlow = 'WalletTabStackFlow',
  WalletConnectSessionsView = 'WalletConnectSessionsView',

  // Vault Recovery Routes
  RestoreWallet = 'RestoreWallet',
  WalletRestored = 'WalletRestored',
  WalletResetNeeded = 'WalletResetNeeded',

  // Network Routes
  AddNetwork = 'AddNetwork',
  EditNetwork = 'EditNetwork',

  // Trading Routes
  Swaps = 'Swaps',
  SwapsAmountView = 'SwapsAmountView',

  // Bridge Routes
  Bridge = 'Bridge',
  BridgeView = 'BridgeView',
  BridgeModals = 'BridgeModals',
  BridgeSourceTokenSelector = 'BridgeSourceTokenSelector',
  BridgeSourceNetworkSelector = 'BridgeSourceNetworkSelector',
  SlippageModal = 'SlippageModal',
  BridgeDestTokenSelector = 'BridgeDestTokenSelector',
  BridgeDestNetworkSelector = 'BridgeDestNetworkSelector',
  QuoteInfoModal = 'QuoteInfoModal',
  TransactionDetailsBlockExplorer = 'TransactionDetailsBlockExplorer',
  QuoteExpiredModal = 'QuoteExpiredModal',
  BlockaidModal = 'BlockaidModal',
  PriceImpactWarningModal = 'PriceImpactWarningModal',
  BridgeTransactionDetails = 'BridgeTransactionDetails',

  // Perps Routes
  Perps = 'Perps',
  PerpsTradingView = 'PerpsTradingView',
  PerpsOrder = 'PerpsOrder',
  PerpsWithdraw = 'PerpsWithdraw',
  PerpsPositions = 'PerpsPositions',
  PerpsMarketListView = 'PerpsMarketListView',
  PerpsMarketDetails = 'PerpsMarketDetails',
  PerpsTutorial = 'PerpsTutorial',
  PerpsClosePosition = 'PerpsClosePosition',
  PerpsModals = 'PerpsModals',
  PerpsQuoteExpiredModal = 'PerpsQuoteExpiredModal',
  PerpsBalanceModal = 'PerpsBalanceModal',
  PerpsPositionTransaction = 'PerpsPositionTransaction',
  PerpsOrderTransaction = 'PerpsOrderTransaction',
  PerpsFundingTransaction = 'PerpsFundingTransaction',

  // Confirmation Routes
  LockScreen = 'LockScreen',
  ConfirmationRequestModal = 'ConfirmationRequestModal',
  ConfirmationSwitchAccountType = 'ConfirmationSwitchAccountType',
  ConfirmationPayWithModal = 'ConfirmationPayWithModal',
  ConfirmationPayWithNetworkModal = 'ConfirmationPayWithNetworkModal',
  SmartAccountOptIn = 'SmartAccountOptIn',

  // Notifications Routes
  NotificationsView = 'NotificationsView',
  OptIn = 'OptIn',
  OptInStack = 'OptInStack',
  NotificationsDetails = 'NotificationsDetails',

  // Staking Routes
  Stake = 'Stake',
  StakeConfirmation = 'StakeConfirmation',
  Unstake = 'Unstake',
  UnstakeConfirmation = 'UnstakeConfirmation',
  EarningsHistory = 'EarningsHistory',
  Claim = 'Claim',
  LearnMore = 'LearnMore',
  MaxInput = 'MaxInput',
  GasImpact = 'GasImpact',
  EarnTokenList = 'EarnTokenList',

  // Earn Routes
  EarnScreens = 'EarnScreens',
  EarnLendingDepositConfirmation = 'EarnLendingDepositConfirmation',
  EarnLendingWithdrawalConfirmation = 'EarnLendingWithdrawalConfirmation',
  EarnModals = 'EarnModals',
  EarnLendingMaxWithdrawalModal = 'EarnLendingMaxWithdrawalModal',
  EarnLendingLearnMoreModal = 'EarnLendingLearnMoreModal',

  // Full Screen Confirmations
  RedesignedConfirmations = 'RedesignedConfirmations',

  // Identity Routes
  TurnOnBackupAndSync = 'TurnOnBackupAndSync',

  // Multi SRP Routes
  ImportSRPView = 'ImportSRPView',

  // Multichain Account Routes
  MultichainAccountDetails = 'MultichainAccountDetails',
  MultichainAccountGroupDetails = 'MultichainAccountGroupDetails',
  MultichainWalletDetails = 'MultichainWalletDetails',
  MultichainAddressList = 'MultichainAddressList',
  MultichainPrivateKeyList = 'MultichainPrivateKeyList',
  MultichainAccountActions = 'MultichainAccountActions',

  // Snaps Routes
  SnapsSettingsList = 'SnapsSettingsList',
  SnapSettings = 'SnapSettings',

  // Misc Routes
  FoxLoader = 'FoxLoader',
  SetPasswordFlow = 'SetPasswordFlow',
  EditAccountName = 'EditAccountName',
  CardScreens = 'CardScreens',
  CardHome = 'CardHome',
  Recipient = 'Recipient',
  Asset = 'Asset',
  Send = 'Send',
  RewardsView = 'RewardsView',
  ReferralRewardsView = 'ReferralRewardsView',
}

const Routes = {
  WALLET_VIEW: RouteNames.WalletView,
  BROWSER_TAB_HOME: RouteNames.BrowserTabHome,
  BROWSER_VIEW: RouteNames.BrowserView,
  SETTINGS_VIEW: RouteNames.SettingsView,
  DEPRECATED_NETWORK_DETAILS: RouteNames.DeprecatedNetworkDetails,
  RAMP: {
    ID: RouteNames.Ramp,
    BUY: RouteNames.RampBuy,
    SELL: RouteNames.RampSell,
    GET_STARTED: RouteNames.GetStarted,
    BUILD_QUOTE: RouteNames.BuildQuote,
    BUILD_QUOTE_HAS_STARTED: RouteNames.BuildQuoteHasStarted,
    QUOTES: RouteNames.Quotes,
    CHECKOUT: RouteNames.Checkout,
    REGION: RouteNames.Region,
    REGION_HAS_STARTED: RouteNames.RegionHasStarted,
    NETWORK_SWITCHER: RouteNames.BuyNetworkSwitcher,
    ORDER_DETAILS: RouteNames.OrderDetails,
    SEND_TRANSACTION: RouteNames.SendTransaction,
    SETTINGS: RouteNames.RampSettings,
    ACTIVATION_KEY_FORM: RouteNames.RampActivationKeyForm,
  },
  DEPOSIT: {
    ID: RouteNames.Deposit,
    ROOT: RouteNames.DepositRoot,
    BUILD_QUOTE: RouteNames.BuildQuote,
    ENTER_EMAIL: RouteNames.EnterEmail,
    OTP_CODE: RouteNames.OtpCode,
    VERIFY_IDENTITY: RouteNames.VerifyIdentity,
    BASIC_INFO: RouteNames.BasicInfo,
    ENTER_ADDRESS: RouteNames.EnterAddress,
    KYC_PROCESSING: RouteNames.KycProcessing,
    ORDER_PROCESSING: RouteNames.OrderProcessing,
    ORDER_DETAILS: RouteNames.DepositOrderDetails,
    BANK_DETAILS: RouteNames.BankDetails,
    ADDITIONAL_VERIFICATION: RouteNames.AdditionalVerification,
    MODALS: {
      ID: RouteNames.DepositModals,
      TOKEN_SELECTOR: RouteNames.DepositTokenSelectorModal,
      REGION_SELECTOR: RouteNames.DepositRegionSelectorModal,
      PAYMENT_METHOD_SELECTOR: RouteNames.DepositPaymentMethodSelectorModal,
      UNSUPPORTED_REGION: RouteNames.DepositUnsupportedRegionModal,
      UNSUPPORTED_STATE: RouteNames.DepositUnsupportedStateModal,
      STATE_SELECTOR: RouteNames.DepositStateSelectorModal,
      WEBVIEW: RouteNames.DepositWebviewModal,
      KYC_WEBVIEW: RouteNames.DepositKycWebviewModal,
      INCOMPATIBLE_ACCOUNT_TOKEN: RouteNames.IncompatibleAccountTokenModal,
      SSN_INFO: RouteNames.SsnInfoModal,
      CONFIGURATION: RouteNames.DepositConfigurationModal,
    },
  },
  HW: {
    CONNECT: RouteNames.ConnectHardwareWalletFlow,
    SELECT_DEVICE: RouteNames.SelectHardwareWallet,
    CONNECT_QR_DEVICE: RouteNames.ConnectQRHardwareFlow,
    CONNECT_LEDGER: RouteNames.ConnectLedgerFlow,
    LEDGER_CONNECT: RouteNames.LedgerConnect,
  },
  LEDGER_MESSAGE_SIGN_MODAL: RouteNames.LedgerMessageSignModal,
  LEDGER_TRANSACTION_MODAL: RouteNames.LedgerTransactionModal,
  QR_TAB_SWITCHER: RouteNames.QRTabSwitcher,
  OPTIONS_SHEET: RouteNames.OptionsSheet,
  QR_SCANNER: RouteNames.QRScanner,
  TRANSACTIONS_VIEW: RouteNames.TransactionsView,
  TRANSACTION_DETAILS: RouteNames.TransactionDetails,
  MODAL: {
    DELETE_WALLET: RouteNames.DeleteWalletModal,
    ROOT_MODAL_FLOW: RouteNames.RootModalFlow,
    MODAL_CONFIRMATION: RouteNames.ModalConfirmation,
    MODAL_MANDATORY: RouteNames.ModalMandatory,
    WHATS_NEW: RouteNames.WhatsNewModal,
    TURN_OFF_REMEMBER_ME: RouteNames.TurnOffRememberMeModal,
    UPDATE_NEEDED: RouteNames.UpdateNeededModal,
    DETECTED_TOKENS: RouteNames.DetectedTokens,
    SRP_REVEAL_QUIZ: RouteNames.SRPRevealQuiz,
    WALLET_ACTIONS: RouteNames.WalletActions,
    FUND_ACTION_MENU: RouteNames.FundActionMenu,
    NFT_AUTO_DETECTION_MODAL: RouteNames.NFTAutoDetectionModal,
    MULTI_RPC_MIGRATION_MODAL: RouteNames.MultiRPcMigrationModal,
    MAX_BROWSER_TABS_MODAL: RouteNames.MaxBrowserTabsModal,
    DEEP_LINK_MODAL: RouteNames.DeepLinkModal,
    MULTICHAIN_ACCOUNT_DETAIL_ACTIONS:
      RouteNames.MultichainAccountDetailActions,
  },
  ONBOARDING: {
    ROOT_NAV: RouteNames.OnboardingRootNav,
    SUCCESS_FLOW: RouteNames.OnboardingSuccessFlow,
    SUCCESS: RouteNames.OnboardingSuccess,
    DEFAULT_SETTINGS: RouteNames.DefaultSettings,
    GENERAL_SETTINGS: RouteNames.GeneralSettings,
    ASSETS_SETTINGS: RouteNames.AssetsSettings,
    SECURITY_SETTINGS: RouteNames.SecuritySettings,
    HOME_NAV: RouteNames.HomeNav,
    ONBOARDING: RouteNames.Onboarding,
    LOGIN: RouteNames.Login,
    NAV: RouteNames.OnboardingNav,
    MANUAL_BACKUP: {
      STEP_1: RouteNames.ManualBackupStep1,
      STEP_2: RouteNames.ManualBackupStep2,
      STEP_3: RouteNames.ManualBackupStep3,
    },
    IMPORT_FROM_SECRET_RECOVERY_PHRASE:
      RouteNames.ImportFromSecretRecoveryPhrase,
    CHOOSE_PASSWORD: RouteNames.ChoosePassword,
    OPTIN_METRICS: RouteNames.OptinMetrics,
  },
  SEND_FLOW: {
    SEND_TO: RouteNames.SendTo,
    AMOUNT: RouteNames.Amount,
    CONFIRM: RouteNames.Confirm,
  },
  ACCOUNT_BACKUP: {
    STEP_1_B: RouteNames.AccountBackupStep1B,
  },
  SETTINGS: {
    ADVANCED_SETTINGS: RouteNames.AdvancedSettings,
    CHANGE_PASSWORD: RouteNames.ResetPassword,
    CONTACT_FORM: RouteNames.ContactForm,
    DEVELOPER_OPTIONS: RouteNames.DeveloperOptions,
    EXPERIMENTAL_SETTINGS: RouteNames.ExperimentalSettings,
    NOTIFICATIONS: RouteNames.NotificationsSettings,
    REVEAL_PRIVATE_CREDENTIAL: RouteNames.RevealPrivateCredentialView,
    SDK_SESSIONS_MANAGER: RouteNames.SDKSessionsManager,
    BACKUP_AND_SYNC: RouteNames.BackupAndSyncSettings,
  },
  SHEET: {
    ACCOUNT_SELECTOR: RouteNames.AccountSelector,
    ADDRESS_SELECTOR: RouteNames.AddressSelector,
    ADD_ACCOUNT: RouteNames.AddAccount,
    AMBIGUOUS_ADDRESS: RouteNames.AmbiguousAddress,
    BASIC_FUNCTIONALITY: RouteNames.BasicFunctionality,
    CONFIRM_TURN_ON_BACKUP_AND_SYNC: RouteNames.ConfirmTurnOnBackupAndSync,
    RESET_NOTIFICATIONS: RouteNames.ResetNotifications,
    SDK_LOADING: RouteNames.SDKLoading,
    SDK_FEEDBACK: RouteNames.SDKFeedback,
    DATA_COLLECTION: RouteNames.DataCollection,
    EXPERIENCE_ENHANCER: RouteNames.ExperienceEnhancer,
    SDK_MANAGE_CONNECTIONS: RouteNames.SDKManageConnections,
    SDK_DISCONNECT: RouteNames.SDKDisconnect,
    ACCOUNT_CONNECT: RouteNames.AccountConnect,
    ACCOUNT_PERMISSIONS: RouteNames.AccountPermissions,
    REVOKE_ALL_ACCOUNT_PERMISSIONS: RouteNames.RevokeAllAccountPermissions,
    CONNECTION_DETAILS: RouteNames.ConnectionDetails,
    PERMITTED_NETWORKS_INFO_SHEET: RouteNames.PermittedNetworksInfoSheet,
    NETWORK_SELECTOR: RouteNames.NetworkSelector,
    RETURN_TO_DAPP_MODAL: RouteNames.ReturnToDappModal,
    ACCOUNT_ACTIONS: RouteNames.AccountActions,
    FIAT_ON_TESTNETS_FRICTION:
      RouteNames.SettingsAdvancedFiatOnTestnetsFriction,
    SHOW_IPFS: RouteNames.ShowIpfs,
    SHOW_NFT_DISPLAY_MEDIA: RouteNames.ShowNftDisplayMedia,
    SHOW_TOKEN_ID: RouteNames.ShowTokenId,
    ORIGIN_SPAM_MODAL: RouteNames.OriginSpamModal,
    TOOLTIP_MODAL: RouteNames.TooltipModal,
    TOKEN_SORT: RouteNames.TokenSort,
    TOKEN_FILTER: RouteNames.TokenFilter,
    NETWORK_MANAGER: RouteNames.NetworkManager,
    CHANGE_IN_SIMULATION_MODAL: RouteNames.ChangeInSimulationModal,
    SELECT_SRP: RouteNames.SelectSRP,
    ONBOARDING_SHEET: RouteNames.OnboardingSheet,
    SEEDPHRASE_MODAL: RouteNames.SeedphraseModal,
    SKIP_ACCOUNT_SECURITY_MODAL: RouteNames.SkipAccountSecurityModal,
    SUCCESS_ERROR_SHEET: RouteNames.SuccessErrorSheet,
    MULTICHAIN_ACCOUNT_DETAILS: {
      EDIT_ACCOUNT_NAME: RouteNames.MultichainEditAccountName,
      EDIT_WALLET_NAME: RouteNames.EditWalletName,
      SHARE_ADDRESS: RouteNames.ShareAddress,
      SHARE_ADDRESS_QR: RouteNames.ShareAddressQR,
      DELETE_ACCOUNT: RouteNames.DeleteAccount,
      REVEAL_PRIVATE_CREDENTIAL: RouteNames.MultichainRevealPrivateCredential,
      REVEAL_SRP_CREDENTIAL: RouteNames.RevealSRPCredential,
      SRP_REVEAL_QUIZ: RouteNames.SRPRevealQuizInMultichainAccountDetails,
      SMART_ACCOUNT: RouteNames.SmartAccount,
    },
  },
  BROWSER: {
    HOME: RouteNames.BrowserTabHome,
    VIEW: RouteNames.BrowserView,
    ASSET_LOADER: RouteNames.AssetLoader,
    ASSET_VIEW: RouteNames.AssetView,
  },
  WEBVIEW: {
    MAIN: RouteNames.Webview,
    SIMPLE: RouteNames.SimpleWebview,
  },
  WALLET: {
    HOME: RouteNames.WalletTabHome,
    TAB_STACK_FLOW: RouteNames.WalletTabStackFlow,
    WALLET_CONNECT_SESSIONS_VIEW: RouteNames.WalletConnectSessionsView,
  },
  VAULT_RECOVERY: {
    RESTORE_WALLET: RouteNames.RestoreWallet,
    WALLET_RESTORED: RouteNames.WalletRestored,
    WALLET_RESET_NEEDED: RouteNames.WalletResetNeeded,
  },
  ADD_NETWORK: RouteNames.AddNetwork,
  EDIT_NETWORK: RouteNames.EditNetwork,
  SWAPS: RouteNames.Swaps,
  SWAPS_AMOUNT_VIEW: RouteNames.SwapsAmountView,
  BRIDGE: {
    ROOT: RouteNames.Bridge,
    BRIDGE_VIEW: RouteNames.BridgeView,
    MODALS: {
      ROOT: RouteNames.BridgeModals,
      SOURCE_TOKEN_SELECTOR: RouteNames.BridgeSourceTokenSelector,
      SOURCE_NETWORK_SELECTOR: RouteNames.BridgeSourceNetworkSelector,
      SLIPPAGE_MODAL: RouteNames.SlippageModal,
      DEST_TOKEN_SELECTOR: RouteNames.BridgeDestTokenSelector,
      DEST_NETWORK_SELECTOR: RouteNames.BridgeDestNetworkSelector,
      QUOTE_INFO_MODAL: RouteNames.QuoteInfoModal,
      TRANSACTION_DETAILS_BLOCK_EXPLORER:
        RouteNames.TransactionDetailsBlockExplorer,
      QUOTE_EXPIRED_MODAL: RouteNames.QuoteExpiredModal,
      BLOCKAID_MODAL: RouteNames.BlockaidModal,
      PRICE_IMPACT_WARNING_MODAL: RouteNames.PriceImpactWarningModal,
    },
    BRIDGE_TRANSACTION_DETAILS: RouteNames.BridgeTransactionDetails,
  },
  PERPS: {
    ROOT: RouteNames.Perps,
    TRADING_VIEW: RouteNames.PerpsTradingView,
    ORDER: RouteNames.PerpsOrder,
    WITHDRAW: RouteNames.PerpsWithdraw,
    POSITIONS: RouteNames.PerpsPositions,
    MARKETS: RouteNames.PerpsMarketListView,
    MARKET_DETAILS: RouteNames.PerpsMarketDetails,
    TUTORIAL: RouteNames.PerpsTutorial,
    CLOSE_POSITION: RouteNames.PerpsClosePosition,
    MODALS: {
      ROOT: RouteNames.PerpsModals,
      QUOTE_EXPIRED_MODAL: RouteNames.PerpsQuoteExpiredModal,
      BALANCE_MODAL: RouteNames.PerpsBalanceModal,
    },
    POSITION_TRANSACTION: RouteNames.PerpsPositionTransaction,
    ORDER_TRANSACTION: RouteNames.PerpsOrderTransaction,
    FUNDING_TRANSACTION: RouteNames.PerpsFundingTransaction,
  },
  LOCK_SCREEN: RouteNames.LockScreen,
  CONFIRMATION_REQUEST_MODAL: RouteNames.ConfirmationRequestModal,
  CONFIRMATION_SWITCH_ACCOUNT_TYPE: RouteNames.ConfirmationSwitchAccountType,
  CONFIRMATION_PAY_WITH_MODAL: RouteNames.ConfirmationPayWithModal,
  CONFIRMATION_PAY_WITH_NETWORK_MODAL:
    RouteNames.ConfirmationPayWithNetworkModal,
  SMART_ACCOUNT_OPT_IN: RouteNames.SmartAccountOptIn,
  NOTIFICATIONS: {
    VIEW: RouteNames.NotificationsView,
    OPT_IN: RouteNames.OptIn,
    OPT_IN_STACK: RouteNames.OptInStack,
    DETAILS: RouteNames.NotificationsDetails,
  },
  STAKING: {
    STAKE: RouteNames.Stake,
    STAKE_CONFIRMATION: RouteNames.StakeConfirmation,
    UNSTAKE: RouteNames.Unstake,
    UNSTAKE_CONFIRMATION: RouteNames.UnstakeConfirmation,
    EARNINGS_HISTORY: RouteNames.EarningsHistory,
    CLAIM: RouteNames.Claim,
    MODALS: {
      LEARN_MORE: RouteNames.LearnMore,
      MAX_INPUT: RouteNames.MaxInput,
      GAS_IMPACT: RouteNames.GasImpact,
      EARN_TOKEN_LIST: RouteNames.EarnTokenList,
    },
  },
  EARN: {
    ROOT: RouteNames.EarnScreens,
    LENDING_DEPOSIT_CONFIRMATION: RouteNames.EarnLendingDepositConfirmation,
    LENDING_WITHDRAWAL_CONFIRMATION:
      RouteNames.EarnLendingWithdrawalConfirmation,
    MODALS: {
      ROOT: RouteNames.EarnModals,
      LENDING_MAX_WITHDRAWAL: RouteNames.EarnLendingMaxWithdrawalModal,
      LENDING_LEARN_MORE: RouteNames.EarnLendingLearnMoreModal,
    },
  },
  FULL_SCREEN_CONFIRMATIONS: {
    REDESIGNED_CONFIRMATIONS: RouteNames.RedesignedConfirmations,
  },
  IDENTITY: {
    TURN_ON_BACKUP_AND_SYNC: RouteNames.TurnOnBackupAndSync,
  },
  MULTI_SRP: {
    IMPORT: RouteNames.ImportSRPView,
  },
  MULTICHAIN_ACCOUNTS: {
    ACCOUNT_DETAILS: RouteNames.MultichainAccountDetails,
    ACCOUNT_GROUP_DETAILS: RouteNames.MultichainAccountGroupDetails,
    WALLET_DETAILS: RouteNames.MultichainWalletDetails,
    ADDRESS_LIST: RouteNames.MultichainAddressList,
    PRIVATE_KEY_LIST: RouteNames.MultichainPrivateKeyList,
    ACCOUNT_CELL_ACTIONS: RouteNames.MultichainAccountActions,
  },
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  SNAPS: {
    SNAPS_SETTINGS_LIST: RouteNames.SnapsSettingsList,
    SNAP_SETTINGS: RouteNames.SnapSettings,
  },
  ///: END:ONLY_INCLUDE_IF
  FOX_LOADER: RouteNames.FoxLoader,
  SEEDPHRASE_MODAL: RouteNames.SeedphraseModal,
  SET_PASSWORD_FLOW: {
    ROOT: RouteNames.SetPasswordFlow,
    MANUAL_BACKUP_STEP_1: RouteNames.ManualBackupStep1,
    MANUAL_BACKUP_STEP_2: RouteNames.ManualBackupStep2,
    MANUAL_BACKUP_STEP_3: RouteNames.ManualBackupStep3,
  },

  EDIT_ACCOUNT_NAME: RouteNames.EditAccountName,
  CARD: {
    ROOT: RouteNames.CardScreens,
    HOME: RouteNames.CardHome,
  },
  SEND: {
    RECIPIENT: RouteNames.Recipient,
    ASSET: RouteNames.Asset,
    AMOUNT: RouteNames.Amount,
    DEFAULT: RouteNames.Send,
  },
  REWARDS_VIEW: RouteNames.RewardsView,
  REFERRAL_REWARDS_VIEW: RouteNames.ReferralRewardsView,
} as const;

// Type constraint to ensure Routes values are valid navigation targets
type ValidRouteKey = keyof RootParamList;

// Utility function to create type-safe route constants
export function createTypedRoute<T extends ValidRouteKey>(routeName: T): T {
  return routeName;
}

// Validation for direct route mappings (not nested objects)
type DirectRouteValidation = {
  readonly [K in keyof typeof Routes]: (typeof Routes)[K] extends string
    ? (typeof Routes)[K] extends ValidRouteKey
      ? (typeof Routes)[K]
      : never
    : (typeof Routes)[K]; // Allow nested objects
};

// Uncomment the line below to enable compile-time validation of direct routes
// const _directRouteValidation: DirectRouteValidation = Routes;

export { RouteNames };
export default Routes;
