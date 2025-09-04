import { IconColor, IconName } from '@metamask/design-system-react-native';
import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../core/SnapKeyring/MultichainWalletSnapClient';
import { Collectible } from '../../components/UI/CollectibleMedia/CollectibleMedia.types';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWalletId } from '@metamask/account-api';
import { TokenI } from '../../components/UI/Tokens/types';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { BridgeToken, BridgeViewMode } from '../../components/UI/Bridge/types';
import { Nft } from '@metamask/assets-controllers';
import { NavigatorScreenParams } from '@react-navigation/native';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Transaction } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';

export type RootParamList = {
  // Detected Tokens Flow
  DetectedTokensConfirmation: { isHidingAll?: boolean; onConfirm: () => void };
  DetectedTokens: undefined;

  // Onboarding Screens
  OnboardingSuccess: {
    successFlow: string; // ONBOARDING_SUCCESS_FLOW type
  };
  DefaultSettings: undefined;
  GeneralSettings: undefined;
  AssetsSettings: undefined;
  SecuritySettings: undefined;
  OnboardingSuccessFlow: undefined;
  OnboardingNav: undefined;
  HomeNav: undefined;
  Login: undefined;
  OnboardingRootNav: undefined;
  ImportFromSecretRecoveryPhrase: undefined;
  OptinMetrics: undefined;
  OnboardingCarousel: undefined;
  Onboarding: undefined;
  ChoosePassword: undefined;
  AccountBackupStep1: undefined;
  AccountBackupStep1B: undefined;
  ManualBackupStep1: undefined;
  ManualBackupStep2: undefined;
  ManualBackupStep3: undefined;
  AccountStatus: { type?: 'found' | 'not_exist'; onboardingTraceCtx?: string };
  AccountAlreadyExists: undefined;
  AccountNotFound: undefined;
  Rehydrate: undefined;

  // Webview Screens
  SimpleWebview: {
    url?: string;
    title?: string; // Used by navigation header, not directly by component
  };
  Webview: undefined;

  // QR and Tab Switcher
  QRTabSwitcher: undefined;

  // Vault Recovery
  RestoreWallet: undefined;
  WalletRestored: undefined;
  WalletResetNeeded: undefined;

  // Network Management
  AddNetwork:
    | {
        network?: string;
      }
    | undefined;
  EditNetwork:
    | {
        network?: string;
      }
    | undefined;

  // Modal Screens
  WalletActions: undefined;
  FundActionMenu: undefined;
  DeleteWalletModal: undefined;
  ModalConfirmation: {
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    cancelLabel?: string;
    confirmLabel?: string;
    isDanger?: boolean;
  };
  ModalMandatory: {
    containerTestId: string;
    buttonTestId: string;
    buttonText: string;
    checkboxText: string;
    headerTitle: string;
    onAccept: () => Promise<void> | (() => void);
    footerHelpText: string;
    body:
      | {
          source: 'WebView';
          html?: string;
          uri?: string;
        }
      | {
          source: 'Node';
          component: () => React.ReactNode;
        };
    onRender?: () => void;
    isScrollToEndNeeded: boolean;
    scrollEndBottomMargin: number;
  };
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  SRPRevealQuiz: {
    keyringId?: string;
  };
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: undefined;
  MultichainAccountDetailActions: {
    screen: string;
    params?: Record<string, unknown>;
  };
  RootModalFlow: {
    screen: string;
    params?: Record<string, unknown>;
  };

  // Sheet Screens
  OnboardingSheet: {
    onPressCreate?: () => void;
    onPressImport?: () => void;
    onPressContinueWithGoogle?: (createWallet: boolean) => void;
    onPressContinueWithApple?: (createWallet: boolean) => void;
    createWallet?: boolean;
  };
  SeedphraseModal: undefined;
  SkipAccountSecurityModal: {
    onConfirm?: () => void;
    onCancel?: () => void;
  };
  SuccessErrorSheet: {
    onClose?: () => void;
    onButtonPress?: () => void;
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    customButton?: React.ReactNode;
    type: 'success' | 'error';
    icon?: IconName;
    secondaryButtonLabel?: string;
    onSecondaryButtonPress?: () => void;
    primaryButtonLabel?: string;
    onPrimaryButtonPress?: () => void;
    isInteractable?: boolean;
    closeOnPrimaryButtonPress?: boolean;
    closeOnSecondaryButtonPress?: boolean;
    reverseButtonOrder?: boolean;
    descriptionAlign?: 'center' | 'left';
    iconColor?: IconColor;
  };
  AccountSelector: undefined;
  AddressSelector: undefined;
  AddAccount:
    | {
        scope: CaipChainId;
        clientType: WalletClientType;
      }
    | undefined;
  SDKLoading: undefined;
  SDKFeedback: undefined;
  SDKManageConnections: {
    channelId?: string;
    icon?: string;
    urlOrTitle: string;
    version?: string;
    platform?: string;
  };
  ExperienceEnhancer: undefined;
  DataCollection: undefined;
  SDKDisconnect: {
    channelId?: string;
    account?: string;
    accountName?: string;
    dapp?: string;
    accountsLength?: number;
  };
  AccountConnect: {
    hostInfo: any;
    permissionRequestId: string;
  };
  AccountPermissions: {
    hostInfo: {
      metadata: { origin: string };
    };
    isRenderedAsBottomSheet?: boolean;
    initialScreen?: any;
    isNonDappNetworkSwitch?: boolean;
  };
  RevokeAllAccountPermissions: {
    hostInfo: {
      metadata: { origin: string };
    };
    onRevokeAll?: () => void;
  };
  ConnectionDetails: {
    connectionDateTime?: number;
  };
  PermittedNetworksInfoSheet: undefined;
  NetworkSelector: {
    onSelectNetwork?: (chainId: string) => void;
    isPickerScreen?: boolean;
    source?: any;
  };
  TokenSort: undefined;
  TokenFilter: undefined;
  NetworkManager: undefined;
  BasicFunctionality: {
    caller: string;
  };
  ConfirmTurnOnBackupAndSync: undefined;
  ResetNotifications: undefined;
  ReturnToDappModal: undefined;
  AccountActions: undefined;
  SettingsAdvancedFiatOnTestnetsFriction: undefined;
  ShowIpfs: undefined;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: undefined;
  AmbiguousAddress: undefined;
  OriginSpamModal: { origin: string };
  ChangeInSimulationModal: {
    onProceed: () => void;
    onReject: () => void;
  };
  TooltipModal: { title: string; tooltip: string | any };
  SelectSRP: undefined;

  // Multichain Account Sheets
  MultichainEditAccountName: {
    account: InternalAccount;
  };
  ShareAddress: {
    account: InternalAccount;
  };
  ShareAddressQR: {
    address: string;
    networkName: string;
    chainId: string;
    accountName: string;
  };
  DeleteAccount: {
    account: InternalAccount;
  };
  SRPRevealQuizInMultichainAccountDetails: {
    keyringId?: string;
  };
  RevealPrivateCredential: {
    account: InternalAccount;
  };
  RevealSRPCredential: {
    account: InternalAccount;
  };

  // Asset/Token Screens
  AssetHideConfirmation: {
    onConfirm: () => void;
  };
  AssetOptions: {
    address: string;
    isNativeCurrency: boolean;
    chainId: string;
    asset: any;
  };
  NftOptions: {
    collectible: Collectible;
  };

  // Hardware Wallet
  ConnectHardwareWalletFlow: undefined;
  SelectHardwareWallet: undefined;
  ConnectLedgerFlow: undefined;
  LedgerConnect: undefined;
  ConnectQRHardwareFlow: undefined;
  ConnectQRHardware: undefined;

  // Import/Private Key Screens
  ImportPrivateKeyView: undefined;
  ImportPrivateKey: undefined;
  ImportPrivateKeySuccess: undefined;
  ImportSRPView: undefined;

  // Multichain Accounts
  MultichainAccountDetails: {
    account: InternalAccount;
  };
  MultichainAccountGroupDetails: {
    accountGroup: any;
  };
  MultichainWalletDetails: {
    walletId: AccountWalletId;
  };
  MultichainAddressList: {
    groupId: string;
    title: string;
  };
  MultichainPrivateKeyList: {
    title: string;
    groupId: string;
  };
  MultichainAccountActions: undefined;
  SmartAccountDetails: {
    account: InternalAccount;
  };

  // Confirmation Screens
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: undefined;
  SmartAccountOptIn: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithNetworkModal: undefined;

  // Main App Screens
  FoxLoader: undefined;
  LockScreen: undefined;
  OptionsSheet: undefined;
  EditAccountName: undefined;
  TransactionsView: undefined;
  TransactionDetails: undefined;

  // Ledger Modals
  LedgerTransactionModal: undefined;
  LedgerMessageSignModal: undefined;

  // Bridge Routes
  Bridge: undefined;
  BridgeView: {
    sourcePage: string;
    bridgeViewMode?: BridgeViewMode; // Component checks if undefined
    sourceToken?: BridgeToken;
    destToken?: BridgeToken;
    sourceAmount?: string;
  };
  BridgeModals: undefined;
  BridgeSourceTokenSelector: undefined;
  BridgeDestTokenSelector: undefined;
  BridgeSourceNetworkSelector: undefined;
  BridgeDestNetworkSelector: {
    shouldGoToTokens?: boolean;
  };
  SlippageModal: undefined;
  QuoteInfoModal: undefined;
  TransactionDetailsBlockExplorer: {
    evmTxMeta?: TransactionMeta;
    multiChainTx?: Transaction;
  };
  QuoteExpiredModal: undefined;
  BlockaidModal: {
    errorMessage: string;
    errorType: 'validation' | 'simulation';
  };
  PriceImpactWarningModal: undefined;
  BridgeTransactionDetails: undefined;

  // Perps Routes
  Perps: undefined;
  PerpsTradingView: undefined;
  PerpsMarketListView: undefined;
  PerpsWithdraw: undefined;
  PerpsMarketDetails: {
    isNavigationFromOrderSuccess?: boolean;
    market?: any;
  };
  PerpsPositions: undefined;
  PerpsOrder: {
    direction?: 'long' | 'short';
    asset?: string;
    amount?: string;
    leverage?: number;
    leverageUpdate?: number;
    orderTypeUpdate?: any;
    tpslUpdate?: {
      takeProfitPrice?: string;
      stopLossPrice?: string;
    };
    limitPriceUpdate?: string;
  };
  PerpsClosePosition: undefined;
  PerpsTutorial: undefined;
  PerpsModals: undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsBalanceModal: undefined;

  // Ramp Routes
  Ramp: undefined;
  RampBuy: undefined;
  RampSell: undefined;
  GetStarted:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  BuildQuote:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  BuildQuoteHasStarted:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  Quotes:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  Checkout:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  Region:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  RegionHasStarted:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  BuyNetworkSwitcher: undefined;

  // Deposit Routes
  Deposit: undefined;
  DepositRoot:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  EnterEmail:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  OtpCode:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  VerifyIdentity:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  BasicInfo:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  EnterAddress:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  KycProcessing:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  OrderProcessing:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  BankDetails:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  AdditionalVerification:
    | {
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;

  // Deposit Modal Routes
  DepositModals: undefined;
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

  // Staking Routes
  Stake: {
    token: TokenI;
  };
  StakeConfirmation: {
    amountWei: string;
    amountFiat: string;
    annualRewardsETH: string;
    annualRewardsFiat: string;
    annualRewardRate: string;
    chainId: string;
  };
  Unstake: {
    token: TokenI;
  };
  UnstakeConfirmation: {
    amountWei: string;
    amountFiat: string;
  };
  EarningsHistory: undefined;
  Claim: undefined;
  LearnMore: undefined;
  MaxInput: undefined;
  GasImpact: {
    amountWei: string;
    amountFiat: string;
    annualRewardsETH: string;
    annualRewardsFiat: string;
    annualRewardRate: string;
    estimatedGasFee: string;
    estimatedGasFeePercentage: string;
    chainId: string;
  };
  EarnTokenList: undefined;

  // Send Routes
  Amount: undefined;
  Send: undefined;
  SendTo: undefined;
  Recipient: undefined;

  // Full Screen Confirmations
  RedesignedConfirmations: undefined;
  Confirm: undefined;

  // Main Navigator Screens
  Main: undefined;
  ReviewModal: undefined;
  Home: undefined;
  CollectiblesDetails: { contractName: string; collectible: Nft };
  DeprecatedNetworkDetails: undefined;
  Asset: {
    address?: string;
    isNative?: boolean;
    isETH?: boolean;
    chainId?: string;
    symbol?: string;
    // Additional params that components access
    [key: string]: any; // Asset component accesses full route.params as asset
  };
  AssetDetails: {
    address: Hex;
    chainId: Hex;
    asset: TokenI;
  };
  SendView: undefined;
  SendFlowView: undefined;
  AddBookmarkView: undefined;
  OfflineModeView: undefined;
  NotificationsView: undefined;
  NftDetails: { collectible: Nft };
  NftDetailsFullImage: { collectible: Nft };
  PaymentRequestView: undefined;
  Swaps: {
    sourceToken?: string; // Component accesses route.params?.sourceToken
    destinationToken?: string; // Component accesses route.params?.destinationToken
    sourcePage?: string; // Component accesses route.params?.sourcePage
  };
  SwapsAmountView: undefined;
  SwapsQuotesView: undefined;
  SetPasswordFlow: undefined;
  DeFiProtocolPositionDetails: undefined;
  CardRoutes: undefined;
  StakeScreens: undefined;
  StakeModals: undefined;

  // Tab Navigator Screens
  WalletHome: undefined;
  BrowserHome: undefined;
  SettingsFlow: undefined;
  SettingsView: undefined;
  RewardsView: undefined;
  ReferralRewardsView: undefined;

  // Asset Flow Screens
  WalletView: {
    shouldSelectPerpsTab?: boolean;
    initialTab?: string;
  };
  WalletTabStackFlow: undefined;
  AddAsset: undefined;
  Collectible: undefined;
  ConfirmAddAsset: undefined;

  // Settings Flow Screens
  Settings: undefined;
  AdvancedSettings: undefined;
  SDKSessionsManager: undefined;
  PermissionsManager: undefined;
  NetworksSettings: undefined;
  CompanySettings: undefined;
  ContactsSettings: undefined;
  ContactForm: undefined;
  AccountPermissionsAsFullScreen: { initialScreen?: any };
  WalletConnectSessionsView: undefined;
  ResetPassword: undefined;
  WalletRecovery: undefined;
  AesCryptoTestForm: undefined;
  EnterPasswordSimple: undefined;
  NotificationsSettings: undefined;
  BackupAndSyncSettings: undefined;
  DeveloperOptions: undefined;
  RevealPrivateCredentialView: undefined;

  // Notification Flow Screens
  NotificationsOptInStack: undefined;
  OptInStack: undefined;
  OptIn: undefined;
  NotificationsDetails: undefined;

  // Browser Flow Screens
  BrowserView: {
    url?: string; // Component accesses props.route?.params?.url
    linkType?: string; // Component accesses props.route?.params?.linkType
    newTabUrl?: string;
    existingTabId?: string;
    timestamp?: number;
  };
  AssetView: undefined;
  AssetLoader: undefined;

  // Payment Flow Screens
  PaymentRequest: undefined;
  PaymentRequestSuccess: undefined;

  // Bookmarks
  AddBookmark: undefined;

  // Offline
  OfflineMode: undefined;

  // Perps Transaction Views
  PerpsPositionTransaction: undefined;
  PerpsOrderTransaction: undefined;
  PerpsFundingTransaction: undefined;

  // Identity
  TurnOnBackupAndSync: undefined;

  // Earn Flow Screens
  EarnScreens: undefined;
  EarnModals: undefined;
  EarnLendingDepositConfirmation: undefined;
  EarnLendingWithdrawalConfirmation: undefined;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: undefined;

  // Card Flow Screens
  CardScreens: undefined;
  CardHome: undefined;

  // Snaps (conditional compilation)
  SnapsSettingsList: undefined;
  SnapSettings: undefined;
};

export type NavigatableRootParamList = {
  [K in keyof RootParamList]:
    | RootParamList[K] // Direct navigation
    | NavigatorScreenParams<RootParamList>; // Nested navigation
};
