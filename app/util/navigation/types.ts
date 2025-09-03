import { IconColor, IconName } from '@metamask/design-system-react-native';
import { CaipChainId } from '@metamask/utils';
import { WalletClientType } from '../../core/SnapKeyring/MultichainWalletSnapClient';
import { Collectible } from '../../components/UI/CollectibleMedia/CollectibleMedia.types';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountWalletId } from '@metamask/account-api';

export type RootParamList = {
  // Detected Tokens Flow
  DetectedTokensConfirmation: { isHidingAll?: boolean; onConfirm: () => void };
  DetectedTokens: undefined;

  // Onboarding Screens
  OnboardingSuccess: undefined;
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
  SimpleWebview: { url?: string; title?: string };
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

  // Ledger Modals
  LedgerTransactionModal: undefined;
  LedgerMessageSignModal: undefined;
};
