/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-namespace */
import type {
  IconColor as DSIconColor,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import type {
  IconColor,
  IconName,
} from '../../component-library/components/Icons/Icon';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupId } from '@metamask/account-api';
import type { BuyQuote } from '@consensys/native-ramps-sdk';
import type { BasicInfoFormData } from '../../components/UI/Ramp/Deposit/Views/BasicInfo/BasicInfo';
import type { AddressFormData } from '../../components/UI/Ramp/Deposit/Views/EnterAddress/EnterAddress';
import type {
  BridgeToken,
  BridgeViewMode,
} from '../../components/UI/Bridge/types';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { Hex } from '@metamask/utils';
import type { DeepLinkModalParams } from '../../components/UI/DeepLinkModal';
import type { Snap } from '@metamask/snaps-utils';
import type { Provider } from '@consensys/on-ramp-sdk';
import { AccountSelectorParams } from '../../components/Views/AccountSelector/AccountSelector.types';
import { QRTabSwitcherParams } from '../../components/Views/QRTabSwitcher';
import { OptionsSheetParams } from '../../components/UI/SelectOptionSheet/types';
import { AddressSelectorParams } from '../../components/Views/AddressSelector/AddressSelector.types';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RampIntent } from '../../components/UI/Ramp/Aggregator/types';
import { EarnWithdrawalConfirmationViewRouteParams } from '../../components/UI/Earn/Views/EarnLendingWithdrawalConfirmationView/types';
import { UnstakeConfirmationParams } from '../../components/UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import { SRPQuizParams } from '../../components/Views/Quiz/SRPQuiz';
import { AccountStatusParams } from '../../components/Views/AccountStatus/types';
import { ONBOARDING_SUCCESS_FLOW } from '../../constants/onboarding';
import { EarnTokenDetails } from '../../components/UI/Earn/types/lending.types';
import { NetworkSelectorRouteParams } from '../../components/Views/NetworkSelector/types';
import { EarnInputViewRouteParams } from '../../components/UI/Earn/Views/EarnInputView/EarnInputView.types';
import { LendingDepositViewRouteParams } from '../../components/UI/Earn/Views/EarnLendingDepositConfirmationView/types';
import { EarnWithdrawInputViewParams } from '../../components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.types';
import { FundActionMenuParams } from '../../components/UI/FundActionMenu/FundActionMenu.types';
import { PerpsRouteParams } from '../../components/UI/Perps/controllers/types';
import { PerpsOrderViewParams } from '../../components/UI/Perps/Views/PerpsOrderView/types';
import { StakeEarningsHistoryViewParams } from '../../components/UI/Stake/Views/StakeEarningsHistoryView/StakeEarningsHistoryView.types';
import { CollectibleModalParams } from '../../components/UI/CollectibleModal/CollectibleModal.types';
import { DeFiProtocolPositionDetailsParams } from '../../components/UI/DeFiPositions/DefiProtocolPositionDetails.types';
import { ConfirmTurnOnBackupAndSyncModalParams } from '../../components/UI/Identity/ConfirmTurnOnBackupAndSyncModal/types';
import { LedgerMessageSignModalParams } from '../../components/UI/LedgerModals/LedgerMessageSignModal.types';
import { LedgerTransactionModalParams } from '../../components/UI/LedgerModals/LedgerTransactionModal.types';
import { QuotesParams } from '../../components/UI/Ramp/Aggregator/Views/Quotes/Quotes.types';
import { ActivationKeyFormParams } from '../../components/UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm.types';
import { AddAssetParams } from '../../components/Views/AddAsset/AddAsset.types';
import { PayWithModalParams } from '../../components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.types';
import { PrivateKeyListParams } from '../../components/Views/MultichainAccounts/PrivateKeyList/types';
import { NftDetailsParams } from '../../components/Views/NftDetails/NftDetails.types';
import { NftOptionsParams } from '../../components/Views/NftOptions/NftOptions.types';
import { RestoreWalletParams } from '../../components/Views/RestoreWallet/RestoreWallet.types';
import { DeveloperOptionsParams } from '../../components/Views/Settings/DeveloperOptions/DeveloperOptions.types';
import { BackupAndSyncSettingsParams } from '../../components/Views/Settings/Identity/BackupAndSyncSettings.types';
import { SecuritySettingsParams } from '../../components/Views/Settings/SecuritySettings/SecuritySettings.types';
import { ShowIpfsGatewaySheetParams } from '../../components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.types';
import { ShowTokenIdSheetParams } from '../../components/Views/ShowTokenIdSheet/ShowTokenIdSheet.types';
import { LoginParams } from '../../components/Views/Login/types';
import { ModalConfirmationParams } from '../../component-library/components/Modals/ModalConfirmation/ModalConfirmation.types';
import { MandatoryModalParams } from '../../component-library/components/Modals/ModalMandatory/ModalMandatory.types';
import { BridgeTransactionDetailsParams } from '../../components/UI/Bridge/components/TransactionDetails/TransactionDetails.types';
import { AccountPermissionsParams } from '../../components/Views/AccountPermissions/AccountPermissions.types';
import { AccountPermissionsConfirmRevokeAllParams } from '../../components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll/AccountPermissionsConfirmRevokeAll.types';
import { ConnectionDetailsParams } from '../../components/Views/AccountPermissions/ConnectionDetails/ConnectionDetails.types';
import { AddNewAccountBottomSheetParams } from '../../components/Views/AddNewAccount/AddNewAccountBottomSheet.types';
import { AssetDetailsParams } from '../../components/Views/AssetDetails/AssetDetails.types';
import { AssetLoaderParams } from '../../components/Views/AssetLoader/types';
import { AssetOptionsParams } from '../../components/Views/AssetOptions/AssetOptions.types';
import { ChangeInSimulationModalParams } from '../../components/Views/ChangeInSimulationModal/ChangeInSimulationModal.types';
import { AccountDetailsParams } from '../../components/Views/MultichainAccounts/AccountDetails/AccountDetails.types';
import { WalletDetailsParams } from '../../components/Views/MultichainAccounts/WalletDetails/WalletDetails.types';
import { NotificationsDetailsParams } from '../../components/Views/Notifications/Details/types';
import { OnboardingSheetParams } from '../../components/Views/OnboardingSheet/types';
import { OriginSpamModalParams } from '../../components/Views/OriginSpamModal/OriginSpamModal.types';
import { MultichainRevealPrivateCredentialParams } from '../../components/Views/MultichainAccounts/sheets/RevealPrivateKey/RevealPrivateKey.types';
import { RevealPrivateCredentialParams } from '../../components/Views/RevealPrivateCredential/RevealPrivateCredential.types';
import { SDKSessionModalParams } from '../../components/Views/SDK/SDKSessionModal/SDKSessionModal.types';
import { ExperimentalSettingsParams } from '../../components/Views/Settings/ExperimentalSettings/ExperimentalSettings.types';
import { NotificationsSettingsParams } from '../../components/Views/Settings/NotificationsSettings/NotificationsSettings.types';
import { TooltipModalParams } from '../../components/Views/TooltipModal/ToolTipModal.types';
import { AccountConnectParams } from '../../components/Views/AccountConnect/AccountConnect.types';
import { MarketDetailsParams } from '../../components/UI/Perps/Views/PerpsMarketDetailsView';
import { RegionSelectorModalParams } from '../../components/UI/Ramp/Deposit/Views/Modals/RegionSelectorModal/RegionSelectorModal.types';

// This MUST use type and not interface according to docs - https://reactnavigation.org/docs/typescript/?config=dynamic#type-checking-screens
export type RootParamList = {
  // Detected Tokens Flow
  DetectedTokensConfirmation: { isHidingAll?: boolean; onConfirm: () => void };
  DetectedTokens: undefined;

  // Onboarding Screens
  OnboardingSuccess: {
    successFlow: ONBOARDING_SUCCESS_FLOW;
  };
  DefaultSettings: undefined;
  GeneralSettings: undefined;
  AssetsSettings: undefined;
  SecuritySettings: SecuritySettingsParams | undefined;
  OnboardingSuccessFlow: undefined;
  OnboardingNav: undefined;
  HomeNav: undefined;
  Login: LoginParams | undefined;
  OnboardingRootNav: undefined;
  ImportFromSecretRecoveryPhrase: undefined;
  OptinMetrics: undefined;
  OnboardingCarousel: undefined;
  Onboarding: undefined;
  ChoosePassword: undefined;
  AccountBackupStep1: undefined;
  AccountBackupStep1B: undefined;
  ManualBackupStep1: {
    backupFlow: boolean;
  };
  ManualBackupStep2: undefined;
  ManualBackupStep3: undefined;
  AccountStatus: AccountStatusParams;
  AccountAlreadyExists: AccountStatusParams;
  AccountNotFound: AccountStatusParams;
  Rehydrate: LoginParams;

  Webview: undefined;
  SimpleWebview: { url?: string; title?: string };

  // QR and Tab Switcher
  QRTabSwitcher: QRTabSwitcherParams;

  // Vault Recovery
  RestoreWallet: RestoreWalletParams;
  WalletRestored: undefined;
  WalletResetNeeded: undefined;

  // Network Management
  AddNetwork:
    | {
        shouldNetworkSwitchPopToWallet?: boolean;
        shouldShowPopularNetworks?: boolean;
        network?: string;
        isCustomMainnet?: boolean;
      }
    | undefined;
  EditNetwork:
    | {
        network?: string;
      }
    | undefined;

  // Modal Screens
  WalletActions: undefined;
  FundActionMenu: FundActionMenuParams;
  DeleteWalletModal:
    | {
        oauthLoginSuccess?: boolean;
        isResetWallet?: boolean;
      }
    | undefined;
  ModalConfirmation: ModalConfirmationParams;
  ModalMandatory: MandatoryModalParams;
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  OptionsSheet: OptionsSheetParams;
  SRPRevealQuiz: SRPQuizParams | undefined;
  NFTAutoDetectionModal: undefined;
  MultiRPcMigrationModal: undefined;
  MaxBrowserTabsModal: undefined;
  DeepLinkModal: DeepLinkModalParams;
  MultichainAccountDetailActions: undefined;
  RootModalFlow: undefined;

  // Sheet Screens
  OnboardingSheet: OnboardingSheetParams;
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
    icon?: IconName | DSIconName;
    secondaryButtonLabel?: string;
    onSecondaryButtonPress?: () => void;
    primaryButtonLabel?: string;
    onPrimaryButtonPress?: () => void;
    isInteractable?: boolean;
    closeOnPrimaryButtonPress?: boolean;
    closeOnSecondaryButtonPress?: boolean;
    reverseButtonOrder?: boolean;
    descriptionAlign?: 'center' | 'left';
    iconColor?: IconColor | DSIconColor;
  };
  AccountSelector: AccountSelectorParams | undefined;
  AddressSelector: AddressSelectorParams;
  AddAccount: AddNewAccountBottomSheetParams | undefined;
  SDKLoading: undefined;
  SDKFeedback: undefined;
  SDKManageConnections: SDKSessionModalParams;
  ExperienceEnhancer: undefined;
  DataCollection: undefined;
  SDKDisconnect:
    | {
        channelId?: string;
        account?: string;
        accountName?: string;
        dapp?: string;
        accountsLength?: number;
      }
    | undefined;
  AccountConnect: AccountConnectParams;
  AccountPermissions: AccountPermissionsParams;
  RevokeAllAccountPermissions: AccountPermissionsConfirmRevokeAllParams;
  ConnectionDetails: ConnectionDetailsParams;
  PermittedNetworksInfoSheet: undefined;
  NetworkSelector: NetworkSelectorRouteParams | undefined;
  TokenSort: undefined;
  TokenFilter: undefined;
  NetworkManager: undefined;
  BasicFunctionality:
    | {
        caller: string;
      }
    | undefined;
  ConfirmTurnOnBackupAndSync: ConfirmTurnOnBackupAndSyncModalParams;
  ResetNotifications: undefined;
  ReturnToDappModal: undefined;
  AccountActions: { selectedAccount: InternalAccount };
  SettingsAdvancedFiatOnTestnetsFriction: undefined;
  ShowIpfs: ShowIpfsGatewaySheetParams;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: ShowTokenIdSheetParams;
  AmbiguousAddress: undefined;
  OriginSpamModal: OriginSpamModalParams;
  ChangeInSimulationModal: ChangeInSimulationModalParams;
  TooltipModal: TooltipModalParams;
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
  SRPRevealQuizInMultichainAccountDetails: SRPQuizParams | undefined;
  MultichainRevealPrivateCredential: MultichainRevealPrivateCredentialParams;
  RevealSRPCredential: {
    account: InternalAccount;
  };

  // Asset/Token Screens
  AssetHideConfirmation: {
    onConfirm: () => void;
  };
  AssetOptions: AssetOptionsParams;
  NftOptions: NftOptionsParams;

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
  MultichainAccountDetails: AccountDetailsParams;
  MultichainAccountGroupDetails: {
    accountGroup: AccountGroupObject;
  };
  MultichainWalletDetails: WalletDetailsParams;
  MultichainAddressList: {
    groupId: AccountGroupId;
    title: string;
  };
  MultichainPrivateKeyList: PrivateKeyListParams;
  MultichainAccountActions: {
    accountGroup: AccountGroupObject;
  };
  SmartAccountDetails: {
    account: InternalAccount;
  };

  // Confirmation Screens
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: {
    address: string;
  };
  SmartAccountOptIn: undefined;
  ConfirmationPayWithModal: PayWithModalParams;
  ConfirmationPayWithNetworkModal: undefined;

  // Main App Screens
  FoxLoader: undefined;
  LockScreen: { bioStateMachineId: string };
  EditAccountName: {
    selectedAccount: InternalAccount;
  };
  TransactionsView:
    | {
        redirectToOrders?: boolean;
        redirectToPerpsTransactions?: boolean;
      }
    | undefined;
  TransactionDetails: undefined;

  // Ledger Modals
  LedgerTransactionModal: LedgerTransactionModalParams;
  LedgerMessageSignModal: LedgerMessageSignModalParams;

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
  PriceImpactWarningModal: {
    isGasIncluded: boolean;
  };
  BridgeTransactionDetails: BridgeTransactionDetailsParams;

  // Perps Routes
  Perps: undefined;
  PerpsTradingView: undefined;
  PerpsMarketListView: undefined;
  PerpsWithdraw: undefined;
  PerpsMarketDetails: MarketDetailsParams;
  PerpsPositions: undefined;
  PerpsOrder: PerpsOrderViewParams;
  PerpsClosePosition: PerpsRouteParams<'PerpsClosePosition'>;
  PerpsTutorial: PerpsRouteParams<'PerpsTutorial'> | undefined;
  PerpsModals: undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsBalanceModal: undefined;

  // Ramp Routes
  Ramp: undefined;
  RampBuy: undefined;
  RampSell: undefined;
  RampSettings: undefined;
  GetStarted: RampIntent | undefined;
  // TODO: This route name is duplicated for Aggregator and Deposit. Make the names unique
  BuildQuote:
    | {
        showBack?: boolean;
        shouldRouteImmediately?: boolean;
        animationEnabled?: boolean;
      }
    | undefined;
  BuildQuoteHasStarted:
    | {
        animationEnabled?: boolean; // Used in routes to control animation
        quote?: BuyQuote;
      }
    | undefined;
  Quotes: QuotesParams;
  Checkout: {
    url: string;
    customOrderId?: string;
    provider: Provider;
  };
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
  OrderDetails: {
    orderId?: string;
    redirectToSendTransaction?: boolean;
  };
  RampActivationKeyForm: ActivationKeyFormParams;
  SendTransaction: {
    orderId: string;
  };

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
        redirectToRootAfterAuth?: boolean;
        animationEnabled?: boolean;
      }
    | undefined;
  OtpCode: {
    email: string;
    stateToken: string;
    redirectToRootAfterAuth?: boolean;
    animationEnabled?: boolean;
  };
  VerifyIdentity: { animationEnabled?: boolean } | undefined;
  BasicInfo: {
    quote: BuyQuote;
    previousFormData?: BasicInfoFormData & AddressFormData;
    animationEnabled?: boolean;
  };
  EnterAddress: {
    quote: BuyQuote;
    previousFormData?: BasicInfoFormData & AddressFormData;
    animationEnabled?: boolean;
  };
  KycProcessing: {
    quote: BuyQuote;
    kycUrl?: string;
    animationEnabled?: boolean;
  };
  OrderProcessing: {
    orderId: string;
    animationEnabled?: boolean;
  };
  BankDetails: {
    orderId: string;
    shouldUpdate?: boolean;
    animationEnabled?: boolean;
  };
  AdditionalVerification: {
    quote: BuyQuote;
    kycUrl: string;
    workFlowRunId: string;
    cryptoCurrencyChainId: string;
    paymentMethodId: string;
    animationEnabled?: boolean;
  };
  DepositOrderDetails: {
    orderId: string;
    animationEnabled?: boolean;
  };

  // Deposit Modal Routes
  DepositModals: undefined;
  DepositTokenSelectorModal: {
    selectedAssetId?: string;
    handleSelectAssetId?: (assetId: string) => void;
  };
  DepositRegionSelectorModal: RegionSelectorModalParams | undefined;
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
  DepositKycWebviewModal: {
    sourceUrl: string;
    handleNavigationStateChange?: (navState: { url: string }) => void;
    quote: BuyQuote;
    workFlowRunId: string;
    cryptoCurrencyChainId: string;
    paymentMethodId: string;
  };
  IncompatibleAccountTokenModal: undefined;
  SsnInfoModal: undefined;
  DepositConfigurationModal: undefined;

  // Staking Routes
  Stake: EarnInputViewRouteParams;
  StakeConfirmation: {
    amountWei: string;
    amountFiat: string;
    annualRewardsToken?: string;
    annualRewardsETH?: string;
    annualRewardsFiat: string;
    annualRewardRate: string;
    chainId?: string;
  };
  Unstake: EarnWithdrawInputViewParams;
  UnstakeConfirmation: UnstakeConfirmationParams;
  EarningsHistory: StakeEarningsHistoryViewParams;
  Claim: undefined;
  LearnMore: {
    chainId?: string | Hex;
  };
  MaxInput: {
    handleMaxPress: () => void;
  };
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
  EarnTokenList: {
    tokenFilter: {
      includeNativeTokens?: boolean;
      includeStakingTokens?: boolean;
      includeLendingTokens?: boolean;
      includeReceiptTokens?: boolean;
    };
    onItemPressScreen: string;
  };

  // Send Routes
  Amount: undefined;
  Send: undefined;
  SendTo: undefined;
  Recipient: undefined;

  // Full Screen Confirmations
  RedesignedConfirmations: UnstakeConfirmationParams | undefined;
  Confirm: undefined;

  // Main Navigator Screens
  Main: undefined;
  ReviewModal: undefined;
  Home: undefined;
  CollectiblesDetails: CollectibleModalParams;
  DeprecatedNetworkDetails: undefined;
  Asset: {
    address?: string;
    isNative?: boolean;
    isETH?: boolean;
    chainId?: string;
    symbol?: string;
  };
  AssetDetails: AssetDetailsParams;
  SendView: undefined;
  SendFlowView: undefined;
  AddBookmarkView: undefined;
  OfflineModeView: undefined;
  NotificationsView: undefined;
  NftDetails: NftDetailsParams;
  NftDetailsFullImage: NftDetailsParams;
  PaymentRequestView: undefined;
  Swaps:
    | {
        sourceToken?: string; // Component accesses route.params?.sourceToken
        destinationToken?: string; // Component accesses route.params?.destinationToken
        sourcePage?: string; // Component accesses route.params?.sourcePage
      }
    | undefined;
  SwapsAmountView: undefined;
  SwapsQuotesView: undefined;
  SetPasswordFlow: undefined;
  DeFiProtocolPositionDetails: DeFiProtocolPositionDetailsParams;
  CardRoutes: undefined;
  StakeScreens: undefined;
  StakeModals: undefined;

  // Tab Navigator Screens
  WalletTabHome: undefined;
  WalletHome: undefined;
  BrowserHome: undefined;
  SettingsFlow: undefined;
  SettingsView: undefined;
  RewardsView: undefined;
  ReferralRewardsView: undefined;

  // Asset Flow Screens
  WalletView:
    | {
        shouldSelectPerpsTab?: boolean;
        initialTab?: string;
      }
    | undefined;
  WalletTabStackFlow: {
    screen: string;
  };
  AddAsset: AddAssetParams;
  Collectible: undefined;
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

  // Settings Flow Screens
  Settings: undefined;
  AdvancedSettings: undefined;
  SDKSessionsManager: { trigger?: number } | undefined;
  PermissionsManager: undefined;
  NetworksSettings: undefined;
  CompanySettings: undefined;
  ContactsSettings: undefined;
  ContactForm: undefined;
  ExperimentalSettings: ExperimentalSettingsParams;
  AccountPermissionsAsFullScreen: AccountPermissionsParams;
  WalletConnectSessionsView: undefined;
  ResetPassword: undefined;
  WalletRecovery: undefined;
  AesCryptoTestForm: undefined;
  EnterPasswordSimple: { onPasswordSet: (password: string) => void };
  NotificationsSettings: NotificationsSettingsParams;
  BackupAndSyncSettings: BackupAndSyncSettingsParams | undefined;
  DeveloperOptions: DeveloperOptionsParams | undefined;
  RevealPrivateCredentialView: RevealPrivateCredentialParams;

  // Notification Flow Screens
  NotificationsOptInStack: undefined;
  OptInStack: undefined;
  OptIn: undefined;
  NotificationsDetails: NotificationsDetailsParams;

  // Browser Flow Screens
  BrowserTabHome: undefined;
  BrowserView: {
    url?: string; // Component accesses props.route?.params?.url
    linkType?: string; // Component accesses props.route?.params?.linkType
    newTabUrl?: string;
    existingTabId?: string;
    timestamp?: number;
  };
  AssetView: undefined;
  AssetLoader: AssetLoaderParams;

  // Payment Flow Screens
  PaymentRequest: undefined;
  PaymentRequestSuccess: undefined;

  // Bookmarks
  AddBookmark: {
    title: string;
    url: string;
    onAddBookmark: (bookmark: { name: string; url: string }) => void;
  };

  // Offline
  OfflineMode: undefined;

  // Perps Transaction Views
  PerpsPositionTransaction: PerpsRouteParams<'PerpsPositionTransaction'>;
  PerpsOrderTransaction: PerpsRouteParams<'PerpsOrderTransaction'>;
  PerpsFundingTransaction: PerpsRouteParams<'PerpsFundingTransaction'>;

  // Identity
  TurnOnBackupAndSync: undefined;

  // Earn Flow Screens
  EarnScreens: undefined;
  EarnModals: undefined;
  EarnLendingDepositConfirmation: LendingDepositViewRouteParams;
  EarnLendingWithdrawalConfirmation: EarnWithdrawalConfirmationViewRouteParams;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: {
    asset: EarnTokenDetails;
  };

  // Card Flow Screens
  CardScreens: undefined;
  CardHome: undefined;

  // Snaps Routes
  SnapsSettingsList: undefined;
  SnapSettings: {
    snap: Snap;
  };
};

export type NavigatableRootParamList = {
  [K in keyof RootParamList]:
    | RootParamList[K] // Direct navigation
    | NavigatorScreenParams<RootParamList>; // Nested navigation
};

// Specifying default types for React Navigation
// ex. useNavigation, Link, ref, etc - https://reactnavigation.org/docs/typescript/?config=dynamic#specifying-default-types-for-usenavigation-link-ref-etc
declare global {
  namespace ReactNavigation {
    interface RootParamList extends NavigatableRootParamList {}
  }

  // Global type alias so NavigationContainerRef defaults to NavigatableRootParamList everywhere
  type TypedNavigationContainerRef =
    import('@react-navigation/native').NavigationContainerRef<NavigatableRootParamList>;
}
