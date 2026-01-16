/* eslint-disable @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-namespace */
/**
 * Navigation Types for React Navigation v7
 *
 * This file defines the RootParamList with all navigation routes and their params.
 * The global type augmentation at the bottom enables automatic typing
 * for useNavigation() calls throughout the codebase.
 *
 * IMPORTANT: This MUST use `type` and not `interface` according to React Navigation docs.
 * @see https://reactnavigation.org/docs/typescript/?config=dynamic#type-checking-screens
 */

import type {
  IconColor as DSIconColor,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';
import type {
  IconColor,
  IconName,
} from '../component-library/components/Icons/Icon';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { AccountGroupId, AccountGroupId } from '@metamask/account-api';
import type { BuyQuote } from '@consensys/native-ramps-sdk';
import type { BasicInfoFormData } from '../components/UI/Ramp/Deposit/Views/BasicInfo/BasicInfo';
import type { AddressFormData } from '../components/UI/Ramp/Deposit/Views/EnterAddress/EnterAddress';
import type {
  BridgeToken,
  BridgeViewMode,
} from '../components/UI/Bridge/types';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';
import type { Hex } from '@metamask/utils';
import type { DeepLinkModalParams } from '../components/UI/DeepLinkModal';
import type { Snap } from '@metamask/snaps-utils';
import type { Provider } from '@consensys/on-ramp-sdk';
import type { AccountSelectorParams } from '../components/Views/AccountSelector/AccountSelector.types';
import type { QRTabSwitcherParams } from '../components/Views/QRTabSwitcher';
import type { OptionsSheetParams } from '../components/UI/SelectOptionSheet/types';
import type { AddressSelectorParams } from '../components/Views/AddressSelector/AddressSelector.types';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import type { RampIntent } from '../components/UI/Ramp/Aggregator/types';
import type { EarnWithdrawalConfirmationViewRouteParams } from '../components/UI/Earn/Views/EarnLendingWithdrawalConfirmationView/types';
import type { UnstakeConfirmationParams } from '../components/UI/Stake/Views/UnstakeConfirmationView/UnstakeConfirmationView.types';
import type { SRPQuizParams } from '../components/Views/Quiz/SRPQuiz';
import type { AccountStatusParams } from '../components/Views/AccountStatus/types';
import type { ONBOARDING_SUCCESS_FLOW } from '../constants/onboarding';
import type { EarnTokenDetails } from '../components/UI/Earn/types/lending.types';
import type { NetworkSelectorRouteParams } from '../components/Views/NetworkSelector/types';
import type { EarnInputViewRouteParams } from '../components/UI/Earn/Views/EarnInputView/EarnInputView.types';
import type { LendingDepositViewRouteParams } from '../components/UI/Earn/Views/EarnLendingDepositConfirmationView/types';
import type { EarnWithdrawInputViewParams } from '../components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.types';
import type { FundActionMenuParams } from '../components/UI/FundActionMenu/FundActionMenu.types';
import type { PerpsRouteParams } from '../components/UI/Perps/controllers/types';
import type { PerpsOrderViewParams } from '../components/UI/Perps/Views/PerpsOrderView/types';
import type { StakeEarningsHistoryViewParams } from '../components/UI/Stake/Views/StakeEarningsHistoryView/StakeEarningsHistoryView.types';
import type { CollectibleModalParams } from '../components/UI/CollectibleModal/CollectibleModal.types';
import type { DeFiProtocolPositionDetailsParams } from '../components/UI/DeFiPositions/DefiProtocolPositionDetails.types';
import type { ConfirmTurnOnBackupAndSyncModalParams } from '../components/UI/Identity/ConfirmTurnOnBackupAndSyncModal/types';
import type { LedgerMessageSignModalParams } from '../components/UI/LedgerModals/LedgerMessageSignModal.types';
import type { LedgerTransactionModalParams } from '../components/UI/LedgerModals/LedgerTransactionModal.types';
import type { QuotesParams } from '../components/UI/Ramp/Aggregator/Views/Quotes/Quotes.types';
import type { ActivationKeyFormParams } from '../components/UI/Ramp/Aggregator/Views/Settings/ActivationKeyForm.types';
import type { AddAssetParams } from '../components/Views/AddAsset/AddAsset.types';
import type { PayWithModalParams } from '../components/Views/confirmations/components/modals/pay-with-modal/pay-with-modal.types';
import type { PrivateKeyListParams } from '../components/Views/MultichainAccounts/PrivateKeyList/types';
import type { NftDetailsParams } from '../components/Views/NftDetails/NftDetails.types';
import type { NftOptionsParams } from '../components/Views/NftOptions/NftOptions.types';
import type { RestoreWalletParams } from '../components/Views/RestoreWallet/RestoreWallet.types';
import type { DeveloperOptionsParams } from '../components/Views/Settings/DeveloperOptions/DeveloperOptions.types';
import type { BackupAndSyncSettingsParams } from '../components/Views/Settings/Identity/BackupAndSyncSettings.types';
import type { SecuritySettingsParams } from '../components/Views/Settings/SecuritySettings/SecuritySettings.types';
import type { ShowIpfsGatewaySheetParams } from '../components/Views/ShowIpfsGatewaySheet/ShowIpfsGatewaySheet.types';
import type { ShowTokenIdSheetParams } from '../components/Views/ShowTokenIdSheet/ShowTokenIdSheet.types';
import type { LoginParams } from '../components/Views/Login/types';
import type { ModalConfirmationParams } from '../component-library/components/Modals/ModalConfirmation/ModalConfirmation.types';
import type { MandatoryModalParams } from '../component-library/components/Modals/ModalMandatory/ModalMandatory.types';
import type { BridgeTransactionDetailsParams } from '../components/UI/Bridge/components/TransactionDetails/TransactionDetails.types';
import type { AccountPermissionsParams } from '../components/Views/AccountPermissions/AccountPermissions.types';
import type { AccountPermissionsConfirmRevokeAllParams } from '../components/Views/AccountPermissions/AccountPermissionsConfirmRevokeAll/AccountPermissionsConfirmRevokeAll.types';
import type {
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../components/UI/Card/types';
import type { ConnectionDetailsParams } from '../components/Views/AccountPermissions/ConnectionDetails/ConnectionDetails.types';
import type { AddNewAccountBottomSheetParams } from '../components/Views/AddNewAccount/AddNewAccountBottomSheet.types';
import type { AssetDetailsParams } from '../components/Views/AssetDetails/AssetDetails.types';
import type { AssetLoaderParams } from '../components/Views/AssetLoader/types';
import type { AssetOptionsParams } from '../components/Views/AssetOptions/AssetOptions.types';
import type { ChangeInSimulationModalParams } from '../components/Views/ChangeInSimulationModal/ChangeInSimulationModal.types';
import type { AccountDetailsParams } from '../components/Views/MultichainAccounts/AccountDetails/AccountDetails.types';
import type { WalletDetailsParams } from '../components/Views/MultichainAccounts/WalletDetails/WalletDetails.types';
import type { NotificationsDetailsParams } from '../components/Views/Notifications/Details/types';
import type { OnboardingSheetParams } from '../components/Views/OnboardingSheet/types';
import type { OriginSpamModalParams } from '../components/Views/OriginSpamModal/OriginSpamModal.types';
import type { MultichainRevealPrivateCredentialParams } from '../components/Views/MultichainAccounts/sheets/RevealPrivateKey/RevealPrivateKey.types';
import type { RevealPrivateCredentialParams } from '../components/Views/RevealPrivateCredential/RevealPrivateCredential.types';
import type { SDKSessionModalParams } from '../components/Views/SDK/SDKSessionModal/SDKSessionModal.types';
import type { ExperimentalSettingsParams } from '../components/Views/Settings/ExperimentalSettings/ExperimentalSettings.types';
import type { NotificationsSettingsParams } from '../components/Views/Settings/NotificationsSettings/NotificationsSettings.types';
import type { TooltipModalParams } from '../components/Views/TooltipModal/ToolTipModal.types';
import type { AccountConnectParams } from '../components/Views/AccountConnect/AccountConnect.types';
import type { MarketDetailsParams } from '../components/UI/Perps/Views/PerpsMarketDetailsView';
import type { RegionSelectorModalParams } from '../components/UI/Ramp/Deposit/Views/Modals/RegionSelectorModal/RegionSelectorModal.types';
import type { TokenI } from '../components/UI/Tokens/types';
import type { SeasonRewardType } from '../core/Engine/controllers/rewards-controller/types';
import type { PredictNavigationParamList } from '../components/UI/Predict/types/navigation';
import type {
  ModalType,
  ModalAction,
} from '../components/UI/Rewards/components/RewardsBottomSheetModal';

// =============================================================================
// ROOT PARAM LIST
// =============================================================================
// This MUST use type and not interface according to docs
// https://reactnavigation.org/docs/typescript/?config=dynamic#type-checking-screens

export type RootParamList = {
  // =========================================================================
  // Onboarding Screens
  // =========================================================================
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
  ImportFromSecretRecoveryPhrase:
    | {
        previous_screen?: string;
        onboardingTraceCtx?: unknown;
      }
    | undefined;
  OptinMetrics: {
    onContinue: () => void;
  };
  OnboardingCarousel: undefined;
  Onboarding: undefined;
  ChoosePassword:
    | {
        previous_screen?: string;
        oauthLoginSuccess?: boolean;
        onboardingTraceCtx?: unknown;
        accountName?: string;
        provider?: string;
      }
    | undefined;
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

  // =========================================================================
  // Webview
  // Note: Using Record type to avoid circular reference with NavigatorScreenParams<RootParamList>
  // =========================================================================
  Webview: Record<string, unknown> | undefined;
  SimpleWebview: { url?: string; title?: string };

  // =========================================================================
  // QR and Tab Switcher
  // =========================================================================
  QRTabSwitcher: QRTabSwitcherParams;

  // =========================================================================
  // Vault Recovery
  // =========================================================================
  RestoreWallet: RestoreWalletParams;
  WalletRestored: undefined;
  WalletResetNeeded: undefined;

  // =========================================================================
  // Network Management
  // =========================================================================
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
        shouldNetworkSwitchPopToWallet?: boolean;
        shouldShowPopularNetworks?: boolean;
        trackRpcUpdateFromBanner?: boolean;
      }
    | undefined;

  // =========================================================================
  // Modal Screens
  // =========================================================================
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

  // =========================================================================
  // Sheet Screens
  // =========================================================================
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
  ShowIpfs: ShowIpfsGatewaySheetParams | undefined;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: ShowTokenIdSheetParams;
  AmbiguousAddress: undefined;
  OriginSpamModal: OriginSpamModalParams;
  ChangeInSimulationModal: ChangeInSimulationModalParams;
  TooltipModal: TooltipModalParams;
  SelectSRP: undefined;

  // =========================================================================
  // Multichain Account Sheets
  // =========================================================================
  MultichainEditAccountName: {
    account: InternalAccount;
  };
  ShareAddress: {
    account: InternalAccount;
  };
  RevealSRP: {
    account: InternalAccount;
  };
  RevealPrivateKey: {
    account: InternalAccount;
  };
  ShareAddressQR: {
    address: string;
    networkName: string;
    chainId: string;
    groupId: AccountGroupId;
  };
  DeleteAccount: {
    account: InternalAccount;
  };
  SRPRevealQuizInMultichainAccountDetails: SRPQuizParams | undefined;
  MultichainRevealPrivateCredential: MultichainRevealPrivateCredentialParams;

  // =========================================================================
  // Asset/Token Screens
  // =========================================================================
  AssetHideConfirmation: {
    onConfirm: () => void;
  };
  AssetOptions: AssetOptionsParams;
  NftOptions: NftOptionsParams;

  // =========================================================================
  // Hardware Wallet
  // =========================================================================
  ConnectHardwareWalletFlow: undefined;
  SelectHardwareWallet: undefined;
  ConnectLedgerFlow: undefined;
  LedgerConnect: undefined;
  ConnectQRHardwareFlow: undefined;
  ConnectQRHardware: undefined;

  // =========================================================================
  // Import/Private Key Screens
  // =========================================================================
  ImportPrivateKeyView: undefined;
  ImportPrivateKey: undefined;
  ImportPrivateKeySuccess: undefined;
  ImportSRPView: undefined;

  // =========================================================================
  // Multichain Accounts
  // =========================================================================
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

  // =========================================================================
  // Confirmation Screens
  // =========================================================================
  ConfirmationRequestModal: undefined;
  ConfirmationSwitchAccountType: {
    address: string;
  };
  SmartAccountOptIn: undefined;
  ConfirmationPayWithModal: PayWithModalParams;
  ConfirmationPayWithNetworkModal: undefined;

  // =========================================================================
  // Main App Screens
  // =========================================================================
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

  // =========================================================================
  // Ledger Modals
  // =========================================================================
  LedgerTransactionModal: LedgerTransactionModalParams;
  LedgerMessageSignModal: LedgerMessageSignModalParams;

  // =========================================================================
  // Bridge Routes
  // =========================================================================
  Bridge: undefined;
  BridgeView: {
    sourcePage: string;
    bridgeViewMode?: BridgeViewMode;
    sourceToken?: BridgeToken;
    destToken?: BridgeToken;
    sourceAmount?: string;
  };
  BridgeSourceTokenSelector: undefined;
  BridgeDestTokenSelector: undefined;
  BridgeSourceNetworkSelector: undefined;
  BridgeDestNetworkSelector:
    | {
        shouldGoToTokens?: boolean;
      }
    | undefined;
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

  // =========================================================================
  // Perps Routes
  // Note: Using Record type to avoid circular reference with NavigatorScreenParams<RootParamList>
  // =========================================================================
  Perps: Record<string, unknown> | undefined;
  PerpsTradingView: undefined;
  PerpsMarketListView: { source?: string } | undefined;
  PerpsWithdraw: undefined;
  PerpsMarketDetails:
    | MarketDetailsParams
    | {
        market: unknown;
        initialTab?: string;
        source?: string;
        monitoringIntent?: unknown;
      };
  PerpsPositions: undefined;
  PerpsOrder: PerpsOrderViewParams;
  PerpsClosePosition: PerpsRouteParams<'PerpsClosePosition'>;
  PerpsTutorial: PerpsRouteParams<'PerpsTutorial'> | undefined;
  PerpsQuoteExpiredModal: undefined;
  PerpsBalanceModal: undefined;
  PerpsTrendingView: { defaultMarketTypeFilter?: string } | undefined;
  PerpsHIP3Debug: undefined;

  // =========================================================================
  // Ramp Routes
  // =========================================================================
  Ramp: undefined;
  RampBuy: undefined;
  RampSell: undefined;
  RampSettings: undefined;
  GetStarted: RampIntent | undefined;
  BuildQuote:
    | {
        showBack?: boolean;
        shouldRouteImmediately?: boolean;
        animationEnabled?: boolean;
      }
    | undefined;
  BuildQuoteHasStarted:
    | {
        animationEnabled?: boolean;
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
        animationEnabled?: boolean;
        quote?: BuyQuote;
      }
    | undefined;
  RegionHasStarted:
    | {
        animationEnabled?: boolean;
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

  // =========================================================================
  // Deposit Routes
  // =========================================================================
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
  VerifyIdentity: { quote?: BuyQuote; animationEnabled?: boolean } | undefined;
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

  // =========================================================================
  // Deposit Modal Routes
  // =========================================================================
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
  DepositConfigurationModal: object | undefined;

  // =========================================================================
  // Staking Routes
  // =========================================================================
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

  // =========================================================================
  // Send Routes
  // =========================================================================
  Amount: undefined;
  Send: undefined;
  SendTo: undefined;
  Recipient: undefined;

  // =========================================================================
  // Full Screen Confirmations
  // =========================================================================
  RedesignedConfirmations: UnstakeConfirmationParams | undefined;
  Confirm: undefined;

  // =========================================================================
  // Main Navigator Screens
  // =========================================================================
  Main: undefined;
  ReviewModal: undefined;
  Home: undefined;
  CollectiblesDetails: CollectibleModalParams;
  DeprecatedNetworkDetails: undefined;
  AssetStack: undefined;
  Asset: TokenI & { chainId?: string; isFromSearch?: boolean };
  AssetDetails: AssetDetailsParams;
  SendView: undefined;
  SendAsset: undefined;
  SendFlowView: undefined;
  AddBookmarkView: undefined;
  OfflineModeView: undefined;
  NotificationsView: undefined;
  NftDetailsStack: undefined;
  NftDetailsFullImageStack: undefined;
  NftDetails: NftDetailsParams;
  NftDetailsFullImage: NftDetailsParams;
  PaymentRequestView: undefined;
  Swaps:
    | {
        sourceToken?: string;
        destinationToken?: string;
        sourcePage?: string;
      }
    | undefined;
  SwapsAmountView: {
    sourceToken?: string;
    destinationToken?: string;
    chainId?: string;
    sourcePage?: string;
  };
  SwapsQuotesView: undefined;
  SetPasswordFlow: undefined;
  DeFiProtocolPositionDetails: DeFiProtocolPositionDetailsParams;
  CardRoutes: undefined;
  StakeScreens: undefined;
  StakeModalStack: undefined;

  // =========================================================================
  // Tab Navigator Screens
  // =========================================================================
  WalletTabHome: undefined;
  WalletHome: undefined;
  BrowserHome:
    | {
        screen?: string;
        params?: {
          url?: string;
          linkType?: string;
          newTabUrl?: string;
          existingTabId?: string;
          timestamp?: number;
        };
      }
    | undefined;
  SettingsFlow: undefined;
  SettingsView: undefined;
  RewardsView: undefined;
  ReferralRewardsView: undefined;

  // =========================================================================
  // Asset Flow Screens
  // =========================================================================
  WalletView:
    | {
        shouldSelectPerpsTab?: boolean;
        initialTab?: string;
      }
    | undefined;
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

  // =========================================================================
  // Settings Flow Screens
  // =========================================================================
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
  RevealPrivateCredential: {
    credentialName: string;
    shouldUpdateNav?: boolean;
    selectedAccount?: InternalAccount;
    keyringId?: string;
  };

  // =========================================================================
  // Notification Flow Screens
  // =========================================================================
  NotificationsOptInStack: undefined;
  OptInStack: undefined;
  OptIn: undefined;
  NotificationsDetails: NotificationsDetailsParams;

  // =========================================================================
  // Browser Flow Screens
  // =========================================================================
  BrowserTabHome: undefined;
  BrowserView: {
    url?: string;
    linkType?: string;
    newTabUrl?: string;
    existingTabId?: string;
    timestamp?: number;
  };
  AssetLoader: AssetLoaderParams;

  // =========================================================================
  // Payment Flow Screens
  // =========================================================================
  PaymentRequest: undefined;
  PaymentRequestSuccess: undefined;

  // =========================================================================
  // Bookmarks
  // =========================================================================
  AddBookmark: {
    title: string;
    url: string;
    onAddBookmark: (bookmark: { name: string; url: string }) => void;
  };

  // =========================================================================
  // Offline
  // =========================================================================
  OfflineMode: undefined;

  // =========================================================================
  // Perps Transaction Views
  // =========================================================================
  PerpsPositionTransaction: PerpsRouteParams<'PerpsPositionTransaction'>;
  PerpsOrderTransaction: PerpsRouteParams<'PerpsOrderTransaction'>;
  PerpsFundingTransaction: PerpsRouteParams<'PerpsFundingTransaction'>;

  // =========================================================================
  // Identity
  // =========================================================================
  TurnOnBackupAndSync: undefined;

  // =========================================================================
  // Earn Flow Screens
  // =========================================================================
  EarnScreens: undefined;
  EarnLendingDepositConfirmation: LendingDepositViewRouteParams;
  EarnLendingWithdrawalConfirmation: EarnWithdrawalConfirmationViewRouteParams;
  EarnLendingMaxWithdrawalModal: undefined;
  EarnLendingLearnMoreModal: {
    asset: EarnTokenDetails;
  };

  // =========================================================================
  // Card Flow Screens
  // =========================================================================
  CardScreens: undefined;
  CardHome: undefined;
  CardWelcome: undefined;
  CardAuthentication: undefined;
  CardNotification: undefined;
  CardSpendingLimit:
    | {
        flow?: 'manage' | 'enable';
        selectedToken?: CardTokenAllowance;
        priorityToken?: CardTokenAllowance | null;
        allTokens?: CardTokenAllowance[];
        delegationSettings?: DelegationSettingsResponse | null;
        externalWalletDetailsData?:
          | {
              walletDetails: never[];
              mappedWalletDetails: never[];
              priorityWalletDetail: null;
            }
          | {
              walletDetails: CardExternalWalletDetailsResponse;
              mappedWalletDetails: CardTokenAllowance[];
              priorityWalletDetail: CardTokenAllowance | undefined;
            }
          | null;
      }
    | undefined;
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
  CardModals: undefined;
  CardAddFundsModal: undefined;
  CardAssetSelectionModal: undefined;
  CardRegionSelectionModal: undefined;
  CardConfirmModal: undefined;
  CardMainRoutes: undefined;

  // =========================================================================
  // Snaps Routes
  // =========================================================================
  SnapsSettingsList: undefined;
  SnapSettings: {
    snap: Snap;
  };

  // =========================================================================
  // Modal Flow Routes (Navigator containers)
  // Note: Using Record<string, unknown> instead of NavigatorScreenParams<RootParamList>
  // to avoid circular reference errors in TypeScript mapped types.
  // =========================================================================
  RootModalFlow: Record<string, unknown> | undefined;
  BridgeModals: Record<string, unknown> | undefined;
  PerpsModals: Record<string, unknown> | undefined;
  PerpsClosePositionModals: Record<string, unknown> | undefined;
  PredictModals: Record<string, unknown> | undefined;
  EarnModals: Record<string, unknown> | undefined;
  StakeModals: Record<string, unknown> | undefined;
  RampModals: Record<string, unknown> | undefined;
  DepositModals: Record<string, unknown> | undefined;

  // =========================================================================
  // Predict Routes (Root Navigator)
  // =========================================================================
  Predict: NavigatorScreenParams<PredictNavigationParamList> | undefined;

  // =========================================================================
  // Rewards Modal Routes
  // =========================================================================
  RewardsBottomSheetModal: {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    type?: ModalType;
    confirmAction: ModalAction;
    onCancel?: () => void;
    cancelLabel?: string;
    showCancelButton?: boolean;
    cancelMode?: 'cta-button' | 'top-right-cross-icon';
    showIcon?: boolean;
    customIcon?: React.ReactNode;
  };
  RewardsClaimBottomSheetModal: {
    rewardId: string;
    seasonRewardId: string;
    rewardType: SeasonRewardType;
    claimUrl?: string;
    isLocked: boolean;
    hasClaimed: boolean;
    title: string;
    icon: DSIconName;
    description: string;
    showInput?: boolean;
    inputPlaceholder?: string;
  };
  RewardOptInAccountGroupModal: {
    accountGroupId: AccountGroupId;
    addressData: {
      address: string;
      hasOptedIn: boolean;
      scopes: string[];
      isSupported?: boolean;
    }[];
  };
  RewardsReferralBottomSheetModal: undefined;
  RewardsIntroModal: undefined;

  // =========================================================================
  // Wallet Full View Screens
  // =========================================================================
  TokensFullView: undefined;
  TrendingTokensFullView: undefined;

  // =========================================================================
  // Additional Modal Screens
  // =========================================================================
  WhatsNewModal: undefined;
  TradeWalletActions: {
    onDismiss?: () => void;
    buttonLayout?: unknown;
  };
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;
  Pna25BottomSheet: undefined;
  RecipientSelectorModal: undefined;
  TokenInsights: {
    token?: unknown;
    networkName?: string;
  };
  PerpsGTMModal: undefined;
  PerpsTooltip: undefined;
  PerpsCrossMarginWarning: undefined;
  PerpsCloseAllPositions: undefined;
  PerpsCancelAllOrders: undefined;
  PerpsPnlHeroCard: undefined;
  PerpsTrendingView: undefined;
  PerpsActivity: undefined;
  PerpsOrderBook: undefined;
  PerpsTPSL: undefined;
  PerpsAdjustMargin: undefined;
  PerpsSelectModifyAction: undefined;
  PerpsSelectAdjustMarginAction: undefined;
  PerpsSelectOrderType: undefined;
  PerpsOrderDetailsView: undefined;
  PerpsHIP3Debug: undefined;
  PredictGTMModal: undefined;
  PredictMarketList: { entryPoint?: string } | undefined;
  PredictUnavailable: undefined;
  PredictBuyPreview: {
    market: unknown;
    outcome: unknown;
    outcomeToken: unknown;
    entryPoint: string;
  };
  PredictMarketDetails: {
    marketId: string;
    entryPoint: string;
    title?: string;
    image?: string;
    headerShown?: boolean;
  };
  EarnMusdConversionEducation: undefined;
  DetectedTokensConfirmation: undefined;

  // =========================================================================
  // Additional Screen Routes
  // =========================================================================
  WalletTabStackFlow: Record<string, unknown> | undefined;
  ExploreSearch: undefined;
  RewardsDashboard: undefined;
  RewardsSettingsView: undefined;
  RewardsOnboardingFlow: undefined;
  RewardsOnboardingIntro: undefined;
  RewardsOnboarding1: undefined;
  RewardsOnboarding2: undefined;
  RewardsOnboarding3: undefined;
  RewardsOnboarding4: undefined;
  SitesFullView: undefined;
  TrendingFeed: undefined;
  NoHeaderConfirmations: undefined;
  SampleFeature: undefined;
  ReturnToDappToast: undefined;
  LegacyEditMultichainAccountName: {
    account: InternalAccount;
  };
  EditMultichainAccountName: {
    accountGroup: AccountGroupObject;
  };
  EditWalletName: undefined;
  RevealSRPCredential: undefined;
  SmartAccount: {
    account: InternalAccount;
  };
  AssetView: undefined;
  QRScanner: undefined;
  ImportSrpView: undefined;
  RampTokenSelection: undefined;
  EligibilityFailedModal: undefined;
  UnsupportedRegionModal: undefined;
  RampIncompatibleAccountTokenModal: undefined;
  RampRegionSelectorModal: undefined;
  RampUnsupportedRegionModal: undefined;
  RampUnsupportedTokenModal: undefined;
  RampPaymentMethodSelectorModal: undefined;
  RampSettingsModal: undefined;
  RampFiatSelectorModal: undefined;
  RampTokenSelectorModal: undefined;
  DepositErrorDetailsModal: undefined;
  NftFullView: undefined;
  SocialLoginSuccessNewUser:
    | {
        accountName?: string;
        oauthLoginSuccess?: boolean;
        onboardingTraceCtx?: unknown;
        provider?: string;
      }
    | undefined;
  SocialLoginSuccessExistingUser:
    | {
        previous_screen?: string;
        oauthLoginSuccess?: boolean;
        onboardingTraceCtx?: unknown;
      }
    | undefined;

  // =========================================================================
  // Feature Flow Routes
  // =========================================================================
  FeatureFlagOverride: undefined;
  SetPasswordFlow: undefined;
};

// =============================================================================
// NAVIGATABLE ROOT PARAM LIST
// =============================================================================
// Allows nested navigation with NavigatorScreenParams

export type NavigatableRootParamList = {
  [K in keyof RootParamList]: RootParamList[K] | Record<string, unknown>;
};

// =============================================================================
// GLOBAL TYPE AUGMENTATION
// =============================================================================
// Specifying default types for React Navigation
// This enables automatic typing for useNavigation(), Link, ref, etc.
// @see https://reactnavigation.org/docs/typescript/?config=dynamic#specifying-default-types-for-usenavigation-link-ref-etc

declare global {
  namespace ReactNavigation {
    interface RootParamList extends NavigatableRootParamList {}
  }
}

// Typed NavigationContainerRef for use with NavigationService
export type TypedNavigationContainerRef =
  import('@react-navigation/native').NavigationContainerRef<RootParamList>;
