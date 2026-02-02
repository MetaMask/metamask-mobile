import { ParamListBase } from '@react-navigation/native';
import type { LedgerMessageSignModalParams } from '../../components/UI/LedgerModals/LedgerMessageSignModal';
import type { LedgerTransactionModalParams } from '../../components/UI/LedgerModals/LedgerTransactionModal';

// Re-export Ledger modal params for convenience
export type { LedgerMessageSignModalParams, LedgerTransactionModalParams };

/**
 * Navigation parameter types for all routes.
 * This type mirrors the structure of Routes in Routes.ts
 */
export interface RouteParams {
  WALLET_VIEW: undefined;
  BROWSER_TAB_HOME: BrowserParams | undefined;
  BROWSER_VIEW: BrowserParams | undefined;
  SETTINGS_VIEW: undefined;
  DEPRECATED_NETWORK_DETAILS: undefined;
  RAMP: {
    ID: undefined;
    BUY: RampBuySellParams | undefined;
    SELL: RampBuySellParams | undefined;
    TOKEN_SELECTION: undefined;
    GET_STARTED: undefined;
    BUILD_QUOTE: undefined;
    BUILD_QUOTE_HAS_STARTED: undefined;
    QUOTES: undefined;
    CHECKOUT: undefined;
    ORDER_DETAILS: RampOrderDetailsParams | undefined;
    SEND_TRANSACTION: undefined;
    SETTINGS: undefined;
    ACTIVATION_KEY_FORM: undefined;
    AMOUNT_INPUT: undefined;
    MODALS: {
      ID: undefined;
      TOKEN_SELECTOR: undefined;
      FIAT_SELECTOR: undefined;
      INCOMPATIBLE_ACCOUNT_TOKEN: undefined;
      REGION_SELECTOR: undefined;
      UNSUPPORTED_REGION: undefined;
      UNSUPPORTED_TOKEN: undefined;
      PAYMENT_METHOD_SELECTOR: undefined;
      SETTINGS: undefined;
      BUILD_QUOTE_SETTINGS: undefined;
    };
  };
  DEPOSIT: {
    ID: DepositNavigationParams | undefined;
    ROOT: DepositNavigationParams | undefined;
    BUILD_QUOTE: DepositBuildQuoteParams | undefined;
    ENTER_EMAIL: undefined;
    OTP_CODE: undefined;
    VERIFY_IDENTITY: undefined;
    BASIC_INFO: undefined;
    ENTER_ADDRESS: undefined;
    KYC_PROCESSING: undefined;
    ORDER_PROCESSING: undefined;
    ORDER_DETAILS: undefined;
    BANK_DETAILS: undefined;
    ADDITIONAL_VERIFICATION: undefined;
    MODALS: {
      ID: undefined;
      TOKEN_SELECTOR: undefined;
      REGION_SELECTOR: undefined;
      PAYMENT_METHOD_SELECTOR: undefined;
      UNSUPPORTED_REGION: undefined;
      UNSUPPORTED_STATE: undefined;
      STATE_SELECTOR: undefined;
      WEBVIEW: WebviewModalParams | undefined;
      KYC_WEBVIEW: WebviewModalParams | undefined;
      INCOMPATIBLE_ACCOUNT_TOKEN: undefined;
      SSN_INFO: undefined;
      CONFIGURATION: undefined;
      ERROR_DETAILS: undefined;
    };
  };
  HW: {
    CONNECT: undefined;
    SELECT_DEVICE: undefined;
    CONNECT_QR_DEVICE: undefined;
    CONNECT_LEDGER: undefined;
    LEDGER_CONNECT: undefined;
  };
  LEDGER_MESSAGE_SIGN_MODAL: LedgerMessageSignModalParams | undefined;
  LEDGER_TRANSACTION_MODAL: LedgerTransactionModalParams | undefined;
  QR_SIGNING_TRANSACTION_MODAL: undefined;
  QR_TAB_SWITCHER: undefined;
  OPTIONS_SHEET: OptionsSheetParams | undefined;
  QR_SCANNER: QRScannerParams | undefined;
  TRANSACTIONS_VIEW: TransactionsViewParams | undefined;
  TRANSACTION_DETAILS: TransactionDetailsParams | undefined;
  REWARDS_VIEW: undefined;
  REFERRAL_REWARDS_VIEW: undefined;
  REWARDS_SETTINGS_VIEW: undefined;
  REWARDS_DASHBOARD: undefined;
  TRENDING_VIEW: undefined;
  TRENDING_FEED: undefined;
  SITES_FULL_VIEW: undefined;
  EXPLORE_SEARCH: undefined;
  REWARDS_ONBOARDING_FLOW: undefined;
  REWARDS_ONBOARDING_INTRO: undefined;
  REWARDS_ONBOARDING_1: undefined;
  REWARDS_ONBOARDING_2: undefined;
  REWARDS_ONBOARDING_3: undefined;
  REWARDS_ONBOARDING_4: undefined;
  MODAL: {
    DELETE_WALLET: undefined;
    ROOT_MODAL_FLOW: RootModalFlowParams | undefined;
    MODAL_CONFIRMATION: ModalConfirmationParams | undefined;
    MODAL_MANDATORY: ModalMandatoryParams | undefined;
    WHATS_NEW: undefined;
    TURN_OFF_REMEMBER_ME: undefined;
    UPDATE_NEEDED: undefined;
    DETECTED_TOKENS: undefined;
    SRP_REVEAL_QUIZ: SRPRevealQuizParams | undefined;
    WALLET_ACTIONS: undefined;
    TRADE_WALLET_ACTIONS: undefined;
    FUND_ACTION_MENU: undefined;
    NFT_AUTO_DETECTION_MODAL: undefined;
    MULTI_RPC_MIGRATION_MODAL: undefined;
    MAX_BROWSER_TABS_MODAL: undefined;
    DEEP_LINK_MODAL: DeepLinkModalParams | undefined;
    MULTICHAIN_ACCOUNT_DETAIL_ACTIONS:
      | MultichainAccountDetailActionsParams
      | undefined;
    MULTICHAIN_ACCOUNTS_INTRO: undefined;
    MULTICHAIN_ACCOUNTS_LEARN_MORE: undefined;
    PNA25_NOTICE_BOTTOM_SHEET: undefined;
    REWARDS_BOTTOM_SHEET_MODAL: undefined;
    REWARDS_CLAIM_BOTTOM_SHEET_MODAL: undefined;
    REWARDS_OPTIN_ACCOUNT_GROUP_MODAL: undefined;
    REWARDS_REFERRAL_BOTTOM_SHEET_MODAL: undefined;
    OTA_UPDATES_MODAL: undefined;
    REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET: undefined;
  };
  ONBOARDING: {
    ROOT_NAV: undefined;
    SUCCESS_FLOW: undefined;
    SUCCESS: undefined;
    DEFAULT_SETTINGS: undefined;
    GENERAL_SETTINGS: undefined;
    ASSETS_SETTINGS: undefined;
    SECURITY_SETTINGS: undefined;
    HOME_NAV: undefined;
    ONBOARDING: undefined;
    LOGIN: undefined;
    NAV: undefined;
    SOCIAL_LOGIN_SUCCESS_NEW_USER: undefined;
    MANUAL_BACKUP: {
      STEP_1: ManualBackupStep1Params | undefined;
      STEP_2: ManualBackupStep2Params | undefined;
      STEP_3: ManualBackupStep3Params | undefined;
    };
    IMPORT_FROM_SECRET_RECOVERY_PHRASE: undefined;
    CHOOSE_PASSWORD: ChoosePasswordParams | undefined;
    OPTIN_METRICS: OptinMetricsParams | undefined;
    SOCIAL_LOGIN_SUCCESS_EXISTING_USER: undefined;
    REHYDRATE: undefined;
  };
  SEND_FLOW: {
    SEND_TO: SendFlowParams | undefined;
    AMOUNT: SendAmountParams | undefined;
    CONFIRM: SendConfirmParams | undefined;
  };
  ACCOUNT_BACKUP: {
    STEP_1_B: AccountBackupParams | undefined;
  };
  SETTINGS: {
    SECURITY_SETTINGS: undefined;
    ADVANCED_SETTINGS: undefined;
    CHANGE_PASSWORD: undefined;
    CONTACT_FORM: ContactFormParams | undefined;
    DEVELOPER_OPTIONS: undefined;
    EXPERIMENTAL_SETTINGS: undefined;
    NOTIFICATIONS: undefined;
    REVEAL_PRIVATE_CREDENTIAL: RevealPrivateCredentialParams | undefined;
    SDK_SESSIONS_MANAGER: undefined;
    BACKUP_AND_SYNC: undefined;
    REGION_SELECTOR: RegionSelectorParams | undefined;
  };
  SHEET: {
    ACCOUNT_SELECTOR: AccountSelectorParams | undefined;
    ADDRESS_SELECTOR: AddressSelectorParams | undefined;
    ADD_ACCOUNT: AddAccountParams | undefined;
    AMBIGUOUS_ADDRESS: AmbiguousAddressParams | undefined;
    BASIC_FUNCTIONALITY: undefined;
    CONFIRM_TURN_ON_BACKUP_AND_SYNC: undefined;
    RESET_NOTIFICATIONS: undefined;
    SDK_LOADING: SDKLoadingParams | undefined;
    SDK_FEEDBACK: SDKFeedbackParams | undefined;
    DATA_COLLECTION: undefined;
    EXPERIENCE_ENHANCER: undefined;
    SDK_MANAGE_CONNECTIONS: undefined;
    SDK_DISCONNECT: SDKDisconnectParams | undefined;
    ACCOUNT_CONNECT: AccountConnectParams | undefined;
    ACCOUNT_PERMISSIONS: AccountPermissionsParams | undefined;
    REVOKE_ALL_ACCOUNT_PERMISSIONS:
      | RevokeAllAccountPermissionsParams
      | undefined;
    CONNECTION_DETAILS: ConnectionDetailsParams | undefined;
    PERMITTED_NETWORKS_INFO_SHEET: undefined;
    NETWORK_SELECTOR: NetworkSelectorParams | undefined;
    ACCOUNT_ACTIONS: AccountActionsParams | undefined;
    FIAT_ON_TESTNETS_FRICTION: undefined;
    SHOW_IPFS: ShowIpfsParams | undefined;
    SHOW_NFT_DISPLAY_MEDIA: ShowNftDisplayMediaParams | undefined;
    SHOW_TOKEN_ID: ShowTokenIdParams | undefined;
    ORIGIN_SPAM_MODAL: OriginSpamModalParams | undefined;
    TOOLTIP_MODAL: TooltipModalParams | undefined;
    TOKEN_SORT: undefined;
    NETWORK_MANAGER: undefined;
    CHANGE_IN_SIMULATION_MODAL: undefined;
    SELECT_SRP: SelectSRPParams | undefined;
    ONBOARDING_SHEET: undefined;
    SEEDPHRASE_MODAL: SeedphraseModalParams | undefined;
    SKIP_ACCOUNT_SECURITY_MODAL: undefined;
    SUCCESS_ERROR_SHEET: SuccessErrorSheetParams | undefined;
    ELIGIBILITY_FAILED_MODAL: undefined;
    UNSUPPORTED_REGION_MODAL: undefined;
    MULTICHAIN_TRANSACTION_DETAILS:
      | MultichainTransactionDetailsParams
      | undefined;
    TRANSACTION_DETAILS: TransactionDetailsSheetParams | undefined;
    MULTICHAIN_ACCOUNT_DETAILS: {
      ACCOUNT_ACTIONS: MultichainAccountActionsParams | undefined;
      EDIT_ACCOUNT_NAME: EditAccountNameParams | undefined;
      LEGACY_EDIT_ACCOUNT_NAME: EditAccountNameParams | undefined;
      EDIT_WALLET_NAME: EditWalletNameParams | undefined;
      SHARE_ADDRESS: ShareAddressParams | undefined;
      SHARE_ADDRESS_QR: ShareAddressQRParams | undefined;
      DELETE_ACCOUNT: DeleteAccountParams | undefined;
      REVEAL_PRIVATE_CREDENTIAL: RevealPrivateCredentialParams | undefined;
      REVEAL_SRP_CREDENTIAL: RevealSRPCredentialParams | undefined;
      SRP_REVEAL_QUIZ: SRPRevealQuizParams | undefined;
      SMART_ACCOUNT: SmartAccountParams | undefined;
    };
  };
  BROWSER: {
    HOME: BrowserParams | undefined;
    VIEW: BrowserParams | undefined;
    ASSET_LOADER: AssetLoaderParams | undefined;
    ASSET_VIEW: AssetViewParams | undefined;
  };
  WEBVIEW: {
    MAIN: WebviewParams | undefined;
    SIMPLE: SimpleWebviewParams | undefined;
  };
  WALLET: {
    HOME: undefined;
    TAB_STACK_FLOW: undefined;
    WALLET_CONNECT_SESSIONS_VIEW: undefined;
    NFTS_FULL_VIEW: undefined;
    TOKENS_FULL_VIEW: undefined;
    TRENDING_TOKENS_FULL_VIEW: undefined;
  };
  VAULT_RECOVERY: {
    RESTORE_WALLET: undefined;
    WALLET_RESTORED: undefined;
    WALLET_RESET_NEEDED: undefined;
  };
  ADD_NETWORK: AddNetworkParams | undefined;
  EDIT_NETWORK: EditNetworkParams | undefined;
  BRIDGE: {
    ROOT: BridgeParams | undefined;
    BRIDGE_VIEW: BridgeParams | undefined;
    TOKEN_SELECTOR: BridgeTokenSelectorParams | undefined;
    MODALS: {
      ROOT: undefined;
      DEFAULT_SLIPPAGE_MODAL: undefined;
      CUSTOM_SLIPPAGE_MODAL: CustomSlippageModalParams | undefined;
      TRANSACTION_DETAILS_BLOCK_EXPLORER:
        | TransactionDetailsBlockExplorerParams
        | undefined;
      QUOTE_EXPIRED_MODAL: undefined;
      BLOCKAID_MODAL: BlockaidModalParams | undefined;
      RECIPIENT_SELECTOR_MODAL: undefined;
    };
    BRIDGE_TRANSACTION_DETAILS: BridgeTransactionDetailsParams | undefined;
  };
  PERPS: {
    ROOT: undefined;
    PERPS_TAB: undefined;
    WITHDRAW: undefined;
    POSITIONS: undefined;
    PERPS_HOME: PerpsMarketListViewParams | undefined;
    MARKET_DETAILS: PerpsMarketDetailsParams | undefined;
    MARKET_LIST: PerpsMarketListViewParams | undefined;
    TUTORIAL: PerpsTutorialParams | undefined;
    CLOSE_POSITION: PerpsClosePositionParams | undefined;
    HIP3_DEBUG: undefined;
    TPSL: PerpsTPSLParams | undefined;
    ADJUST_MARGIN: PerpsAdjustMarginParams | undefined;
    SELECT_MODIFY_ACTION: PerpsSelectModifyActionParams | undefined;
    SELECT_ADJUST_MARGIN_ACTION:
      | PerpsSelectAdjustMarginActionParams
      | undefined;
    SELECT_ORDER_TYPE: PerpsSelectOrderTypeParams | undefined;
    ORDER_DETAILS: PerpsOrderDetailsParams | undefined;
    PNL_HERO_CARD: PerpsPnlHeroCardParams | undefined;
    ACTIVITY: PerpsActivityParams | undefined;
    ORDER_BOOK: PerpsOrderBookParams | undefined;
    MODALS: {
      ROOT: undefined;
      CLOSE_POSITION_MODALS: undefined;
      QUOTE_EXPIRED_MODAL: undefined;
      GTM_MODAL: undefined;
      CLOSE_ALL_POSITIONS: undefined;
      CANCEL_ALL_ORDERS: undefined;
      TOOLTIP: PerpsTooltipParams | undefined;
      CROSS_MARGIN_WARNING: undefined;
    };
    POSITION_TRANSACTION: PerpsPositionTransactionParams | undefined;
    ORDER_TRANSACTION: PerpsOrderTransactionParams | undefined;
    FUNDING_TRANSACTION: PerpsFundingTransactionParams | undefined;
  };
  PREDICT: {
    ROOT: undefined;
    MARKET_LIST: PredictMarketListParams | undefined;
    MARKET_DETAILS: PredictMarketDetailsParams | undefined;
    ACTIVITY_DETAIL: PredictActivityDetailParams | undefined;
    MODALS: {
      ROOT: undefined;
      BUY_PREVIEW: PredictBuyPreviewParams | undefined;
      SELL_PREVIEW: PredictSellPreviewParams | undefined;
      UNAVAILABLE: undefined;
      ADD_FUNDS_SHEET: undefined;
      GTM_MODAL: undefined;
    };
  };
  LOCK_SCREEN: undefined;
  CONFIRMATION_REQUEST_MODAL: undefined;
  CONFIRMATION_SWITCH_ACCOUNT_TYPE: undefined;
  CONFIRMATION_PAY_WITH_MODAL: undefined;
  CONFIRMATION_PAY_WITH_NETWORK_MODAL: undefined;
  SMART_ACCOUNT_OPT_IN: undefined;
  NOTIFICATIONS: {
    VIEW: undefined;
    OPT_IN: undefined;
    OPT_IN_STACK: undefined;
    DETAILS: NotificationDetailsParams | undefined;
  };
  STAKING: {
    STAKE: StakeParams | undefined;
    STAKE_CONFIRMATION: StakeConfirmationParams | undefined;
    UNSTAKE: UnstakeParams | undefined;
    UNSTAKE_CONFIRMATION: UnstakeConfirmationParams | undefined;
    EARNINGS_HISTORY: undefined;
    CLAIM: ClaimParams | undefined;
    MODALS: {
      LEARN_MORE: LearnMoreModalParams | undefined;
      TRX_LEARN_MORE: undefined;
      MAX_INPUT: MaxInputModalParams | undefined;
      GAS_IMPACT: GasImpactModalParams | undefined;
      EARN_TOKEN_LIST: undefined;
    };
  };
  EARN: {
    ROOT: EarnScreensParams | undefined;
    LENDING_DEPOSIT_CONFIRMATION: LendingConfirmationParams | undefined;
    LENDING_WITHDRAWAL_CONFIRMATION: LendingConfirmationParams | undefined;
    MUSD: {
      CONVERSION_EDUCATION: undefined;
    };
    MODALS: {
      ROOT: undefined;
      LENDING_MAX_WITHDRAWAL: LendingMaxWithdrawalModalParams | undefined;
      LENDING_LEARN_MORE: undefined;
    };
  };
  FULL_SCREEN_CONFIRMATIONS: {
    REDESIGNED_CONFIRMATIONS: undefined;
    NO_HEADER: undefined;
  };
  IDENTITY: {
    TURN_ON_BACKUP_AND_SYNC: undefined;
  };
  MULTI_SRP: {
    IMPORT: undefined;
  };
  MULTICHAIN_ACCOUNTS: {
    ACCOUNT_DETAILS: MultichainAccountDetailsParams | undefined;
    ACCOUNT_GROUP_DETAILS: MultichainAccountGroupDetailsParams | undefined;
    WALLET_DETAILS: MultichainWalletDetailsParams | undefined;
    ADDRESS_LIST: MultichainAddressListParams | undefined;
    PRIVATE_KEY_LIST: MultichainPrivateKeyListParams | undefined;
    ACCOUNT_CELL_ACTIONS: MultichainAccountCellActionsParams | undefined;
  };
  ///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
  SNAPS: {
    SNAPS_SETTINGS_LIST: undefined;
    SNAP_SETTINGS: SnapSettingsParams | undefined;
  };
  ///: END:ONLY_INCLUDE_IF
  FOX_LOADER: FoxLoaderParams | undefined;
  SEEDPHRASE_MODAL: SeedphraseModalParams | undefined;
  SET_PASSWORD_FLOW: {
    ROOT: undefined;
    MANUAL_BACKUP_STEP_1: ManualBackupStep1Params | undefined;
    MANUAL_BACKUP_STEP_2: ManualBackupStep2Params | undefined;
    MANUAL_BACKUP_STEP_3: ManualBackupStep3Params | undefined;
  };
  EDIT_ACCOUNT_NAME: EditAccountNameParams | undefined;
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SAMPLE_FEATURE: undefined;
  ///: END:ONLY_INCLUDE_IF
  CARD: {
    ROOT: undefined;
    CARD_MAIN_ROUTES: undefined;
    HOME: undefined;
    WELCOME: undefined;
    AUTHENTICATION: undefined;
    NOTIFICATION: undefined;
    SPENDING_LIMIT: undefined;
    CHANGE_ASSET: undefined;
    VERIFYING_REGISTRATION: undefined;
    CHOOSE_YOUR_CARD: undefined;
    REVIEW_ORDER: undefined;
    ORDER_COMPLETED: undefined;
    ONBOARDING: {
      ROOT: undefined;
      SIGN_UP: undefined;
      CONFIRM_EMAIL: undefined;
      SET_PHONE_NUMBER: undefined;
      CONFIRM_PHONE_NUMBER: undefined;
      VERIFY_IDENTITY: undefined;
      VERIFYING_VERIFF_KYC: undefined;
      PERSONAL_DETAILS: undefined;
      PHYSICAL_ADDRESS: undefined;
      MAILING_ADDRESS: undefined;
      COMPLETE: undefined;
      KYC_FAILED: undefined;
      KYC_PENDING: undefined;
      WEBVIEW: CardOnboardingWebviewParams | undefined;
    };
    MODALS: {
      ID: undefined;
      ADD_FUNDS: undefined;
      ASSET_SELECTION: undefined;
      REGION_SELECTION: undefined;
      CONFIRM_MODAL: CardConfirmModalParams | undefined;
      PASSWORD: undefined;
      RECURRING_FEE: undefined;
      DAIMO_PAY: undefined;
    };
  };
  SEND: {
    RECIPIENT: SendRecipientParams | undefined;
    ASSET: SendAssetParams | undefined;
    AMOUNT: SendAmountParams | undefined;
    DEFAULT: SendParams | undefined;
  };
  SDK: {
    RETURN_TO_DAPP_NOTIFICATION: ReturnToDappNotificationParams | undefined;
  };
  FEATURE_FLAG_OVERRIDE: undefined;
}

// ============================================================================
// Individual Parameter Types
// ============================================================================

/** Browser navigation parameters */
export interface BrowserParams {
  newTabUrl?: string;
  timestamp?: number | string;
  showTabsView?: boolean;
  existingTabId?: number;
  fromTrending?: boolean;
  fromPerps?: boolean;
  linkType?: string;
  url?: string;
}

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

// LedgerMessageSignModalParams and LedgerTransactionModalParams are imported from
// their respective modal components to ensure type consistency

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

/** Deep link modal parameters */
export interface DeepLinkModalParams {
  url?: string;
}

/** Multichain account detail actions parameters */
export interface MultichainAccountDetailActionsParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Manual backup step 1 parameters */
export interface ManualBackupStep1Params {
  backupFlow?: boolean;
  settingsBackup?: boolean;
  seedPhrase?: string[];
  words?: string[];
}

/** Manual backup step 2 parameters */
export interface ManualBackupStep2Params {
  words: string[];
  steps: string[];
  backupFlow: boolean;
  settingsBackup: boolean;
}

/** Manual backup step 3 parameters */
export interface ManualBackupStep3Params {
  words: string[];
  steps: string[];
  backupFlow: boolean;
}

/** Choose password parameters */
export interface ChoosePasswordParams {
  previousScreen?: string;
}

/** Optin metrics parameters */
export interface OptinMetricsParams {
  onContinue?: () => void;
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

/** Account selector parameters */
export interface AccountSelectorParams {
  onSelectAccount?: (address: string) => void;
  selectedAddresses?: string[];
  isMultiSelect?: boolean;
}

/** Address selector parameters */
export interface AddressSelectorParams {
  onSelectAddress?: (address: string) => void;
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

/** Account connect parameters */
export interface AccountConnectParams {
  hostInfo?: {
    metadata?: {
      origin?: string;
      url?: string;
    };
  };
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

/** Show IPFS parameters */
export interface ShowIpfsParams {
  uri?: string;
}

/** Show NFT display media parameters */
export interface ShowNftDisplayMediaParams {
  uri?: string;
}

/** Show token ID parameters */
export interface ShowTokenIdParams {
  tokenId?: string;
}

/** Origin spam modal parameters */
export interface OriginSpamModalParams {
  origin?: string;
}

/** Tooltip modal parameters */
export interface TooltipModalParams {
  title?: string;
  content?: string;
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

/** Bridge parameters */
export interface BridgeParams {
  sourceToken?: string;
  destToken?: string;
  sourceChainId?: string;
  destChainId?: string;
}

/** Bridge token selector parameters */
export interface BridgeTokenSelectorParams {
  isSource?: boolean;
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

/** Perps market list view parameters */
export interface PerpsMarketListViewParams {
  source?: string;
  variant?: 'full' | 'minimal';
  title?: string;
  showBalanceActions?: boolean;
  showBottomNav?: boolean;
  defaultSearchVisible?: boolean;
  showWatchlistOnly?: boolean;
  defaultMarketTypeFilter?:
    | 'all'
    | 'crypto'
    | 'stocks'
    | 'commodities'
    | 'forex'
    | 'new';
  fromHome?: boolean;
  button_clicked?: string;
  button_location?: string;
}

/** Perps market details parameters */
export interface PerpsMarketDetailsParams {
  market: {
    symbol: string;
    name?: string;
    maxLeverage?: number;
    price?: string;
    change24h?: string;
    change24hPercent?: string;
    volume?: string;
    openInterest?: string;
    marketType?: string;
    marketSource?: string;
  };
  initialTab?: 'position' | 'orders' | 'info';
  source?: string;
  button_clicked?: string;
  button_location?: string;
}

/** Perps tutorial parameters */
export interface PerpsTutorialParams {
  isFromDeeplink?: boolean;
  isFromGTMModal?: boolean;
}

/** Perps close position parameters */
export interface PerpsClosePositionParams {
  position: Record<string, unknown>;
}

/** Perps TPSL parameters */
export interface PerpsTPSLParams {
  asset: string;
  currentPrice?: number;
  direction?: 'long' | 'short';
  position?: Record<string, unknown>;
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  leverage?: number;
  orderType?: 'market' | 'limit';
  limitPrice?: string;
  amount?: string;
  szDecimals?: number;
  onConfirm: (
    takeProfitPrice?: string,
    stopLossPrice?: string,
    trackingData?: Record<string, unknown>,
  ) => Promise<void>;
}

/** Perps adjust margin parameters */
export interface PerpsAdjustMarginParams {
  position: Record<string, unknown>;
  mode: 'add' | 'remove';
}

/** Perps select modify action parameters */
export interface PerpsSelectModifyActionParams {
  position: Record<string, unknown>;
}

/** Perps select adjust margin action parameters */
export interface PerpsSelectAdjustMarginActionParams {
  position: Record<string, unknown>;
}

/** Perps select order type parameters */
export interface PerpsSelectOrderTypeParams {
  currentOrderType: string;
  asset: string;
  direction: 'long' | 'short';
}

/** Perps order details parameters */
export interface PerpsOrderDetailsParams {
  order: Record<string, unknown>;
  action?: 'view' | 'edit' | 'cancel';
}

/** Perps PnL hero card parameters */
export interface PerpsPnlHeroCardParams {
  position: Record<string, unknown>;
  marketPrice?: string;
}

/** Perps activity parameters */
export interface PerpsActivityParams {
  redirectToPerpsTransactions?: boolean;
  redirectToOrders?: boolean;
  showBackButton?: boolean;
}

/** Perps order book parameters */
export interface PerpsOrderBookParams {
  symbol: string;
  marketData?: Record<string, unknown>;
}

/** Perps tooltip parameters */
export interface PerpsTooltipParams {
  title?: string;
  content?: string;
}

/** Perps position transaction parameters */
export interface PerpsPositionTransactionParams {
  transaction: Record<string, unknown>;
}

/** Perps order transaction parameters */
export interface PerpsOrderTransactionParams {
  transaction: Record<string, unknown>;
}

/** Perps funding transaction parameters */
export interface PerpsFundingTransactionParams {
  transaction: Record<string, unknown>;
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

/** Multichain account cell actions parameters */
export interface MultichainAccountCellActionsParams {
  address?: string;
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
  ChoosePassword: ChoosePasswordParams | undefined;
  OptinMetrics: OptinMetricsParams | undefined;
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
  ShowIpfs: ShowIpfsParams | undefined;
  ShowNftDisplayMedia: ShowNftDisplayMediaParams | undefined;
  ShowTokenId: ShowTokenIdParams | undefined;
  OriginSpamModal: OriginSpamModalParams | undefined;
  tooltipModal: TooltipModalParams | undefined;
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
  Bridge: BridgeParams | undefined;
  BridgeView: BridgeParams | undefined;
  BridgeTokenSelector: BridgeTokenSelectorParams | undefined;
  BridgeModals: undefined;
  DefaultSlippageModal: undefined;
  CustomSlippageModal: CustomSlippageModalParams | undefined;
  TransactionDetailsBlockExplorer:
    | TransactionDetailsBlockExplorerParams
    | undefined;
  QuoteExpiredModal: undefined;
  BlockaidModal: BlockaidModalParams | undefined;
  RecipientSelectorModal: undefined;
  BridgeTransactionDetails: BridgeTransactionDetailsParams | undefined;

  // Perps routes
  Perps: undefined;
  PerpsTradingView: undefined;
  PerpsWithdraw: undefined;
  PerpsPositions: undefined;
  PerpsMarketListView: PerpsMarketListViewParams | undefined;
  PerpsMarketDetails: PerpsMarketDetailsParams | undefined;
  PerpsTrendingView: PerpsMarketListViewParams | undefined;
  PerpsTutorial: PerpsTutorialParams | undefined;
  PerpsClosePosition: PerpsClosePositionParams | undefined;
  PerpsHIP3Debug: undefined;
  PerpsTPSL: PerpsTPSLParams | undefined;
  PerpsAdjustMargin: PerpsAdjustMarginParams | undefined;
  PerpsSelectModifyAction: PerpsSelectModifyActionParams | undefined;
  PerpsSelectAdjustMarginAction:
    | PerpsSelectAdjustMarginActionParams
    | undefined;
  PerpsSelectOrderType: PerpsSelectOrderTypeParams | undefined;
  PerpsOrderDetailsView: PerpsOrderDetailsParams | undefined;
  PerpsPnlHeroCard: PerpsPnlHeroCardParams | undefined;
  PerpsActivity: PerpsActivityParams | undefined;
  PerpsOrderBook: PerpsOrderBookParams | undefined;
  PerpsModals: undefined;
  PerpsClosePositionModals: undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsTooltip: PerpsTooltipParams | undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsPositionTransaction: PerpsPositionTransactionParams | undefined;
  PerpsOrderTransaction: PerpsOrderTransactionParams | undefined;
  PerpsFundingTransaction: PerpsFundingTransactionParams | undefined;

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

  // Snaps routes (conditional)
  SnapsSettingsList: undefined;
  SnapSettings: SnapSettingsParams | undefined;

  // Misc routes
  FoxLoader: FoxLoaderParams | undefined;
  SetPasswordFlow: undefined;
  EditAccountName: EditAccountNameParams | undefined;

  // Sample feature (conditional)
  SampleFeature: undefined;

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
