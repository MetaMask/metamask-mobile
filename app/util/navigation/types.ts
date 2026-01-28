/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-namespace */
import type {
  NavigatorScreenParams,
  NavigationProp,
  NavigationState,
} from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import type { Snap } from '@metamask/snaps-utils';

// Import types that definitely exist
import type { TokenI } from '../../components/UI/Tokens/types';
import type { EarnTokenDetails } from '../../components/UI/Earn/types/lending.types';
import type { CollectibleModalParams } from '../../components/UI/CollectibleModal/CollectibleModal.types';
import type { FundActionMenuParams } from '../../components/UI/FundActionMenu/FundActionMenu.types';
import type { PerpsRouteParams } from '../../components/UI/Perps/controllers/types';
import type { AccountSelectorParams } from '../../components/Views/AccountSelector/AccountSelector.types';
import type { OptionsSheetParams } from '../../components/UI/SelectOptionSheet/types';
import type { AddressSelectorParams } from '../../components/Views/AddressSelector/AddressSelector.types';
import type { AccountConnectParams } from '../../components/Views/AccountConnect/AccountConnect.types';
import type { SecuritySettingsParams } from '../../components/Views/Settings/SecuritySettings/SecuritySettings.types';

// Import child navigator param lists
import type { StakeParamList } from '../../components/UI/Stake/routes/types';
import type { EarnParamList } from '../../components/UI/Earn/routes/types';
import type { BridgeParamList } from '../../components/UI/Bridge/types';
import type { CardParamList } from '../../components/UI/Card/routes/types';
import type { RampParamList } from '../../components/UI/Ramp/types';
import type { PerpsNavigationParamList } from '../../components/UI/Perps/types/navigation';
import type { PredictNavigationParamList } from '../../components/UI/Predict/types/navigation';
import type {
  RootModalFlowParamList,
  MultichainAccountDetailActionsParamList,
  WalletTabHomeParamList,
} from '../../components/Nav/App/types';

// Re-export child param lists for external use
export type { StakeParamList } from '../../components/UI/Stake/routes/types';
export type { EarnParamList } from '../../components/UI/Earn/routes/types';
export type { BridgeParamList } from '../../components/UI/Bridge/types';
export type { CardParamList } from '../../components/UI/Card/routes/types';
export type { RampParamList } from '../../components/UI/Ramp/types';
export type { PerpsNavigationParamList } from '../../components/UI/Perps/types/navigation';
export type { PredictNavigationParamList } from '../../components/UI/Predict/types/navigation';
export type {
  RootModalFlowParamList,
  MultichainAccountDetailActionsParamList,
  WalletTabHomeParamList,
} from '../../components/Nav/App/types';

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
  AccountStatus: object | undefined;
  AccountAlreadyExists: undefined;
  AccountNotFound: undefined;
  Rehydrate: undefined;
  OptinMetrics: { onContinue?: () => void } | undefined;
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
  WalletTabHome: NavigatorScreenParams<WalletTabHomeParamList> | undefined;
  WalletHome: undefined;

  // Asset Screens
  Asset:
    | (Partial<TokenI> & {
        chainId?: string | `0x${string}`;
        address?: string;
        symbol?: string;
        name?: string;
        decimals?: number;
        image?: string;
        isFromSearch?: boolean;
        isFromTrending?: boolean;
        pricePercentChange1d?: number;
        isNative?: boolean;
        isETH?: boolean;
      })
    | undefined;
  AssetDetails:
    | {
        address?: string;
        chainId?: string;
        asset?: object;
      }
    | undefined;
  AddAsset:
    | { assetType?: string; collectibleContract?: { address: string } }
    | undefined;
  ConfirmAddAsset: {
    selectedAsset: {
      address: string;
      symbol: string;
      decimals: number;
      iconUrl: string;
      name: string;
      chainId: string;
    }[];
    networkName: string;
    addTokenList: () => Promise<void>;
  };
  Collectible: undefined;
  CollectiblesDetails: CollectibleModalParams;
  NftDetails: { collectible?: object } | undefined;
  NftDetailsFullImage: { collectible?: object } | undefined;
  TokensFullView: undefined;
  TrendingTokensFullView: undefined;
  AssetLoader: object | undefined;
  AssetOptions: { asset?: object } | undefined;
  NftOptions: { collectible?: object } | undefined;

  // Browser Flow
  BrowserTabHome:
    | {
        screen?: string;
        params?: {
          showTabsView?: boolean;
          newTabUrl?: string;
          timestamp?: number;
          fromTrending?: boolean;
          linkType?: string;
          fromPerps?: boolean;
        };
      }
    | undefined;
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
  AddBookmark: {
    title: string;
    url: string;
    onAddBookmark: (bookmark: { name: string; url: string }) => void;
  };
  SimpleWebview: { url?: string; title?: string } | undefined;

  // Settings Flow
  SettingsFlow: undefined;
  Settings: undefined;
  SettingsView:
    | {
        screen?: string;
        params?: {
          scrollToBottom?: boolean;
          isFullScreenModal?: boolean;
        };
      }
    | undefined;
  GeneralSettings: undefined;
  AdvancedSettings: undefined;
  SecuritySettings: SecuritySettingsParams | undefined;
  ExperimentalSettings: object | undefined;
  NotificationsSettings: object | undefined;
  BackupAndSyncSettings: object | undefined;
  DeveloperOptions: object | undefined;
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
  RampActivationKeyForm: object | undefined;
  RevealPrivateCredentialView:
    | {
        credentialName?: string;
        cancel?: () => void;
        shouldUpdateNav?: boolean;
        keyringId?: string | object;
      }
    | undefined;
  ResetPassword: undefined;
  EnterPasswordSimple: { onPasswordSet: (password: string) => void };
  RegionSelector: undefined;
  SettingsRegionSelector: undefined;

  // Snaps
  SnapsSettingsList: undefined;
  SnapSettings: { snap: Snap };

  // Transaction Flow
  TransactionsView:
    | {
        screen?: string;
        initial?: boolean;
        params?: {
          orderId?: string;
          redirectToSendTransaction?: boolean;
          redirectToOrders?: boolean;
          redirectToPerpsTransactions?: boolean;
        };
      }
    | undefined;
  TransactionDetails:
    | {
        transactionObject?: object;
        transactionId?: string;
      }
    | undefined;
  SendView: undefined;
  SendAsset: undefined;
  SendFlowView: undefined;
  SendTo: undefined;
  Amount: undefined;
  Confirm: undefined;
  Send: { screen?: string } | undefined;
  Recipient: undefined;

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
  Ramp: NavigatorScreenParams<RampParamList> | undefined;
  RampBuy: object | undefined;
  RampSell: object | undefined;
  GetStarted: undefined;
  BuildQuote: undefined;
  BuildQuoteHasStarted: undefined;
  Quotes: object | undefined;
  Checkout: undefined;
  OrderDetails: { orderId?: string } | undefined;
  SendTransaction: { orderId?: string } | undefined;
  RampTokenSelection: undefined;
  RampModals: undefined;
  RampTokenSelectorModal: undefined;
  RampFiatSelectorModal: undefined;
  RampRegionSelectorModal: object | undefined;
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
  VerifyIdentity: { animationEnabled?: boolean } | undefined;
  BasicInfo: object | undefined;
  EnterAddress: object | undefined;
  KycProcessing: object | undefined;
  OrderProcessing: { orderId: string; animationEnabled?: boolean };
  DepositOrderDetails: { orderId: string; animationEnabled?: boolean };
  BankDetails: {
    orderId: string;
    shouldUpdate?: boolean;
    animationEnabled?: boolean;
  };
  AdditionalVerification: object | undefined;
  DepositModals: undefined;
  DepositTokenSelectorModal: {
    selectedAssetId?: string;
    handleSelectAssetId?: (assetId: string) => void;
  };
  DepositRegionSelectorModal: object | undefined;
  DepositPaymentMethodSelectorModal: {
    selectedPaymentMethodId?: string;
    handleSelectPaymentMethodId?: (paymentMethodId: string) => void;
  };
  DepositUnsupportedRegionModal: undefined;
  DepositUnsupportedStateModal: {
    stateCode?: string;
    stateName?: string;
    onStateSelect: (stateCode: string) => void;
  };
  DepositStateSelectorModal: {
    selectedState?: string;
    onStateSelect: (stateCode: string) => void;
  };
  DepositWebviewModal: {
    sourceUrl: string;
    handleNavigationStateChange?: (navState: { url: string }) => void;
  };
  DepositKycWebviewModal: object | undefined;
  IncompatibleAccountTokenModal: undefined;
  SsnInfoModal: undefined;
  DepositConfigurationModal: undefined;
  DepositErrorDetailsModal: undefined;

  // Bridge Flow
  Bridge: NavigatorScreenParams<BridgeParamList> | undefined;
  BridgeRoot: undefined;
  BridgeModalsRoot: undefined;
  BridgeModals:
    | {
        screen?: string;
        params?: object;
      }
    | undefined;
  BridgeView: undefined;
  BridgeSettings: undefined;
  BridgeTransactionDetails: object | undefined;
  BridgeSourceTokenSelector: undefined;
  BridgeSourceNetworkSelector: undefined;
  SlippageModal: undefined;
  BridgeDestTokenSelector: undefined;
  BridgeDestNetworkSelector: undefined;
  TransactionDetailsBlockExplorer: undefined;
  QuoteExpiredModal: undefined;
  BlockaidModal: undefined;
  RecipientSelectorModal: undefined;

  // Staking/Earn Flow
  StakeScreens: NavigatorScreenParams<StakeParamList> | undefined;
  Stake: object | undefined;
  StakeConfirmation: {
    amountWei: string;
    amountFiat: string;
    annualRewardsToken?: string;
    annualRewardsETH?: string;
    annualRewardsFiat: string;
    annualRewardRate: string;
    chainId?: string;
  };
  Unstake: object | undefined;
  UnstakeConfirmation: { amountWei: string; amountFiat: string };
  Claim: undefined;
  LearnMore: { chainId?: string | Hex };
  TrxLearnMore: undefined;
  MaxInput: { handleMaxPress: () => void };
  GasImpact: {
    amountWei: string;
    amountFiat: string;
    annualRewardsToken?: string;
    annualRewardsETH?: string;
    annualRewardsFiat: string;
    annualRewardRate: string;
    estimatedGasFee: string;
    estimatedGasFeePercentage: string;
    chainId?: string;
  };
  EarningsHistory: { asset: TokenI };
  EarnScreens: NavigatorScreenParams<EarnParamList> | undefined;
  EarnTokenList: {
    tokenFilter: {
      includeNativeTokens?: boolean;
      includeStakingTokens?: boolean;
      includeLendingTokens?: boolean;
      includeReceiptTokens?: boolean;
    };
    onItemPressScreen: string;
  };
  EarnLendingDepositConfirmation: object | undefined;
  EarnLendingWithdrawalConfirmation: object | undefined;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: { asset: EarnTokenDetails };
  EarnModals:
    | {
        screen?: string;
        params?: {
          asset?: object;
        };
      }
    | undefined;
  EarnMusdConversionEducation: undefined;
  StakeModalStack: undefined;
  StakeModals: undefined;

  // Card Flow
  CardRoutes: NavigatorScreenParams<CardParamList> | undefined;
  CardScreens: NavigatorScreenParams<CardParamList> | undefined;
  CardMainRoutes: undefined;
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: undefined;
  CardNotification: undefined;
  CardSpendingLimit: object | undefined;
  CardChangeAsset: undefined;
  VerifyingRegistration: undefined;
  CardOnboarding: undefined;
  CardOnboardingSignUp: undefined;
  CardOnboardingConfirmEmail: { email: string; password: string };
  CardOnboardingSetPhoneNumber: undefined;
  CardOnboardingConfirmPhoneNumber: {
    phoneCountryCode: string;
    phoneNumber: string;
  };
  CardOnboardingVerifyIdentity: undefined;
  CardOnboardingVerifyingVeriffKYC: undefined;
  CardOnboardingPersonalDetails: undefined;
  CardOnboardingPhysicalAddress: undefined;
  CardOnboardingMailingAddress: undefined;
  CardOnboardingComplete: undefined;
  CardOnboardingKYCFailed: undefined;
  CardOnboardingWebview: { url: string };
  CardModals:
    | {
        screen?: string;
        params?: object;
      }
    | undefined;
  CardAddFundsModal: undefined;
  CardAssetSelectionModal: undefined;
  CardRegionSelectionModal: undefined;
  CardConfirmModal: undefined;

  // Perps Flow
  Perps: NavigatorScreenParams<PerpsNavigationParamList> | undefined;
  PerpsRoot: undefined;
  PerpsTradingView: undefined;
  PerpsTutorial:
    | {
        isFromDeeplink?: boolean;
        isFromGTMModal?: boolean;
        source?: string;
      }
    | undefined;
  PerpsModalsRoot: undefined;
  PerpsModals: undefined;
  PerpsPositionTransaction: PerpsRouteParams<'PerpsPositionTransaction'>;
  PerpsOrderTransaction: PerpsRouteParams<'PerpsOrderTransaction'>;
  PerpsFundingTransaction: PerpsRouteParams<'PerpsFundingTransaction'>;
  PerpsMarketDetails: object | undefined;
  PerpsMarketListView: undefined;
  PerpsTrendingView:
    | {
        source?: string;
        variant?: 'full' | 'minimal';
        title?: string;
        showBalanceActions?: boolean;
        showBottomNav?: boolean;
        defaultSearchVisible?: boolean;
        showWatchlistOnly?: boolean;
        defaultMarketTypeFilter?:
          | 'crypto'
          | 'equity'
          | 'commodity'
          | 'forex'
          | 'all'
          | 'stocks_and_commodities';
        fromHome?: boolean;
        button_clicked?: string;
        button_location?: string;
      }
    | undefined;
  PerpsOrder: undefined;
  PerpsWithdraw: undefined;
  PerpsPositions: undefined;
  PerpsClosePosition: undefined;
  PerpsHIP3Debug: undefined;
  PerpsTPSL:
    | {
        asset: string;
        currentPrice?: number;
        direction?: 'long' | 'short';
        position?: object;
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
          trackingData?: object,
        ) => Promise<void>;
      }
    | undefined;
  PerpsAdjustMargin: undefined;
  PerpsSelectModifyAction: undefined;
  PerpsSelectAdjustMarginAction: undefined;
  PerpsSelectOrderType: undefined;
  PerpsOrderDetailsView: undefined;
  PerpsPnlHeroCard:
    | {
        position?: object;
        marketPrice?: string;
        source?: string;
      }
    | undefined;
  PerpsActivity: undefined;
  PerpsOrderBook: undefined;
  PerpsClosePositionModals:
    | {
        screen?: string;
        params?: object;
      }
    | undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsGTMModal: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsTooltip: undefined;
  PerpsCrossMarginWarning: undefined;

  // Predict Flow
  Predict: NavigatorScreenParams<PredictNavigationParamList> | undefined;
  PredictRoot: undefined;
  PredictModalsRoot: undefined;
  PredictModals: NavigatorScreenParams<PredictNavigationParamList> | undefined;
  PredictMarketList: { entryPoint?: string } | undefined;
  PredictMarketDetails:
    | {
        marketId?: string;
        entryPoint?: string;
        title?: string;
        image?: string;
        isGame?: boolean;
        headerShown?: boolean;
      }
    | undefined;
  PredictActivityDetail: { activity: object } | undefined;
  PredictBuyPreview:
    | {
        market: object;
        outcome: object;
        outcomeToken: object;
        entryPoint?: string;
      }
    | undefined;
  PredictSellPreview:
    | {
        market: object;
        position: object;
        outcome: object;
        entryPoint?: string;
      }
    | undefined;
  PredictUnavailable: undefined;
  PredictAddFundsSheet: undefined;
  PredictGTMModal: undefined;

  // Rewards Flow
  RewardsView:
    | {
        screen?: string;
        params?: {
          screen?: string;
        };
      }
    | undefined;
  ReferralRewardsView: undefined;
  RewardsSettingsView: undefined;
  RewardsDashboard: undefined;
  RewardsOnboardingFlow: undefined;
  RewardsOnboardingIntro: undefined;
  RewardsOnboarding1: undefined;
  RewardsOnboarding2: undefined;
  RewardsOnboarding3: undefined;
  RewardsOnboarding4: undefined;
  RewardsBottomSheetModal:
    | {
        title?: string | React.ReactNode;
        description?: string | React.ReactNode;
        confirmAction?: {
          label?: string;
          onPress?: () => void | Promise<void>;
          variant?: string;
          loadOnPress?: boolean;
          disabled?: boolean;
        };
        onCancel?: () => void;
        cancelLabel?: string;
        showIcon?: boolean;
        customIcon?: React.ReactNode;
        type?: string;
        showCancelButton?: boolean;
        cancelMode?: string;
      }
    | undefined;
  RewardsClaimBottomSheetModal:
    | {
        title?: string;
        icon?: string;
        description?: string;
        claimUrl?: string;
        showInput?: boolean;
        inputPlaceholder?: string;
        rewardId?: string;
        seasonRewardId?: string;
        rewardType?: string;
        isLocked?: boolean;
        hasClaimed?: boolean;
      }
    | undefined;
  RewardsIntroModal: undefined;
  RewardOptInAccountGroupModal:
    | {
        accountGroupId?: string;
        addressData?: {
          address: string;
          hasOptedIn: boolean;
          scopes: string[];
          isSupported: boolean;
        }[];
      }
    | undefined;
  RewardsReferralBottomSheetModal: undefined;
  EndOfSeasonClaimBottomSheet:
    | {
        rewardId?: string;
        seasonRewardId?: string;
        title?: string;
        description?: string;
        contactInfo?: object;
        rewardType?: string;
        showEmail?: string;
        showTelegram?: string;
        url?: string;
        showAccount?: boolean;
      }
    | undefined;

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
  LedgerMessageSignModal: object | undefined;
  LedgerTransactionModal: object | undefined;

  // Account Management
  AccountSelector: AccountSelectorParams | undefined;
  AddressSelector: AddressSelectorParams | undefined;
  AccountConnect: AccountConnectParams | undefined;
  AccountPermissions: object | undefined;
  AccountPermissionsAsFullScreen: object | undefined;
  AccountPermissionsConfirmRevokeAll: object | undefined;
  ConnectionDetails: object | undefined;
  AddNewAccountBottomSheet: object | undefined;
  ImportPrivateKey: undefined;
  ImportPrivateKeyView: undefined;
  ImportPrivateKeySuccess: undefined;
  MultichainAccountDetailActions:
    | NavigatorScreenParams<MultichainAccountDetailActionsParamList>
    | undefined;
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;
  AccountDetails: object | undefined;
  AccountGroupDetails: { accountGroupId: string };
  WalletDetails: object | undefined;

  // Multi-SRP
  ImportNewSecretRecoveryPhrase: undefined;
  MultichainAccountAddressList: undefined;
  MultichainAccountPrivateKeyList: object | undefined;
  ImportSrpView: undefined;
  ImportSRPView: undefined;

  // QR Scanner
  QRTabSwitcher:
    | {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onScanSuccess?: (...args: any[]) => any;
        onStartScan?: (...args: unknown[]) => Promise<void>;
        onScanError?: (error: unknown) => void;
        initialScreen?: unknown;
        disableTabber?: boolean;
        origin?: string;
        networkName?: string;
      }
    | undefined;
  QRScanner: undefined;

  // Modals
  DeleteWalletModal: undefined;
  RootModalFlow: NavigatorScreenParams<RootModalFlowParamList> | undefined;
  ModalConfirmation: object | undefined;
  ModalMandatory: object | undefined;
  WhatsNewModal: undefined;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  DetectedTokens: undefined;
  DetectedTokensConfirmation:
    | { isHidingAll?: boolean; onConfirm?: () => void }
    | undefined;
  SRPRevealQuiz: { page?: number } | undefined;
  WalletActions: undefined;
  TradeWalletActions: undefined;
  FundActionMenu: FundActionMenuParams | undefined;
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: object | undefined;
  Pna25BottomSheet: undefined;
  OTAUpdatesModal: undefined;
  DataCollectionModal: undefined;
  OptionsSheet: OptionsSheetParams | undefined;
  AssetHideConfirmation: { asset?: object } | undefined;
  OnboardingSheet: object | undefined;
  OriginSpamModal: object | undefined;
  TooltipModal: object | undefined;
  ChangeInSimulationModal: object | undefined;
  SuccessErrorSheet: undefined;
  LearnMoreBottomSheet: undefined;
  TurnOnBackupAndSync: undefined;
  ConfirmTurnOnBackupAndSync: object | undefined;
  ReturnToAppNotification: undefined;
  PayWithModal: object | undefined;
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType:
    | {
        screen?: string;
        params?: {
          address?: string;
        };
      }
    | undefined;
  SmartAccountOptIn: undefined;

  // SDK
  SDKSessionModal: object | undefined;
  SDKDisconnectModal: undefined;

  // Network
  NetworkSelector: object | undefined;
  DeprecatedNetworkDetails: undefined;
  NetworkManager: undefined;
  AddNetwork:
    | {
        shouldNetworkSwitchPopToWallet?: boolean;
        shouldShowPopularNetworks?: boolean;
        network?: string;
      }
    | undefined;
  EditNetwork:
    | {
        network?: string;
        shouldNetworkSwitchPopToWallet?: boolean;
        shouldShowPopularNetworks?: boolean;
        trackRpcUpdateFromBanner?: boolean;
      }
    | undefined;

  // Vault Recovery
  RestoreWallet: object | undefined;
  WalletRestored: undefined;
  WalletRestoredError: undefined;
  WalletResetNeeded: undefined;

  // Confirmations
  RedesignedConfirmations:
    | {
        amountWei?: string;
        amountFiat?: string;
        amount?: string;
        maxValueMode?: boolean;
        params?: {
          maxValueMode?: boolean;
        };
        loader?: string | object;
        preferredPaymentToken?: {
          address: string;
          chainId: string;
        };
        outputChainId?: string;
      }
    | undefined;
  NoHeaderConfirmations:
    | {
        amount?: string;
        loader?: string | object;
        maxValueMode?: boolean;
      }
    | undefined;

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
  DeFiProtocolPositionDetails: object | undefined;

  // Offline
  OfflineMode: undefined;

  // Identity
  TurnOnBackupAndSyncFlow: undefined;

  // Miscellaneous
  Webview: undefined;
  SetPasswordFlow:
    | {
        screen?: string;
        params?: {
          backupFlow?: boolean;
        };
      }
    | undefined;
  FeatureFlagOverride: undefined;
  ProfilerManager: undefined;
  LockScreen: undefined;
  ConfirmationPayWithModal: undefined;
  ConfirmationPayWithNetworkModal: undefined;
  EditAccountName: { selectedAccount?: object } | undefined;
  ReturnToDappToast: undefined;
  SampleFeature: undefined;
  AssetsSettings: undefined;
  WalletTabStackFlow: undefined;
  NftFullView: undefined;
  MultichainAddressList: undefined;
  MultichainAccountDetails: { account?: object } | undefined;
  MultichainAccountGroupDetails:
    | {
        accountGroup?: object;
        screen?: string;
        params?: object;
      }
    | undefined;
  MultichainWalletDetails:
    | {
        walletId?: string;
      }
    | undefined;

  // Sheet Routes
  AddAccount:
    | {
        scope?: string;
        clientType?: string;
      }
    | undefined;
  AmbiguousAddress: undefined;
  BasicFunctionality: undefined;
  ResetNotifications: undefined;
  SDKLoading: undefined;
  SDKFeedback: undefined;
  DataCollection: undefined;
  ExperienceEnhancer: undefined;
  SDKManageConnections: undefined;
  SDKDisconnect: undefined;
  RevokeAllAccountPermissions: undefined;
  PermittedNetworksInfoSheet: undefined;
  AccountActions: undefined;
  SettingsAdvancedFiatOnTestnetsFriction: undefined;
  ShowIpfs: object | undefined;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: object | undefined;
  TokenSort: undefined;
  SelectSRP: undefined;
  SeedphraseModal: undefined;
  SkipAccountSecurityModal: undefined;
  EligibilityFailedModal: undefined;
  UnsupportedRegionModal: undefined;

  // Multichain Account Details
  MultichainAccountActions: undefined;
  EditMultichainAccountName: { accountGroup?: object } | undefined;
  LegacyEditMultichainAccountName: { accountGroup?: object } | undefined;
  EditWalletName: undefined;
  ShareAddress: undefined;
  ShareAddressQR: undefined;
  DeleteAccount: undefined;
  RevealPrivateCredential: object | undefined;
  RevealSRPCredential: undefined;
  SRPRevealQuizInMultichainAccountDetails:
    | {
        keyringId?: string | number | boolean | object | unknown[];
      }
    | undefined;
  SmartAccount: undefined;
  SmartAccountDetails: { account?: object } | undefined;

  // Browser
  AssetView: undefined;
};

/**
 * Navigation state type returned by getState().
 */
/**
 * Type alias for navigation props that works with both:
 * 1. Direct NavigationProp<RootParamList>
 * 2. The modified type returned by useNavigation() (with Omit<..., "getState">)
 *
 * Use this type in function signatures that accept navigation props.
 */
export type RootNavigationProp = Omit<
  NavigationProp<RootParamList>,
  'getState'
> & {
  getState(): NavigationState | undefined;
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

export {};
