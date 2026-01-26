import type { ReactNode } from 'react';
import type { LayoutRectangle } from 'react-native';
import type { FundActionMenuParams } from '../../../components/UI/FundActionMenu/FundActionMenu.types';
import type { OptionsSheetParams } from '../../../components/UI/SelectOptionSheet/types';
import type { AccountSelectorParams } from '../../../components/Views/AccountSelector/AccountSelector.types';
import type { AccountConnectParams } from '../../../components/Views/AccountConnect/AccountConnect.types';

/**
 * Param list for the RootModalFlow navigator.
 * This contains all modal screens accessible via navigate('RootModalFlow', { screen, params }).
 */
export interface RootModalFlowParamList {
  // Wallet Actions
  WalletActions: undefined;
  TradeWalletActions: {
    onDismiss?: () => void;
    buttonLayout?: LayoutRectangle;
  };
  FundActionMenu: FundActionMenuParams | undefined;

  // Modals
  DeleteWalletModal: undefined;
  ModalConfirmation: object | undefined;
  ModalMandatory: object | undefined;

  // Settings/Options
  OnboardingSheet: object | undefined;
  AssetOptions: { asset?: object } | undefined;
  NftOptions: { collectible?: object } | undefined;
  OptionsSheet: OptionsSheetParams | undefined;
  AssetHideConfirmation:
    | {
        asset?: object;
        onConfirm?: () => Promise<void>;
      }
    | undefined;

  // Remember Me / Security
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  OTAUpdatesModal: undefined;

  // Quiz/Reveal
  SRPRevealQuiz: { page?: number } | undefined;

  // NFT/Token Detection
  NFTAutoDetectionModal: undefined;
  DetectedTokens: undefined;
  DetectedTokensConfirmation: object | undefined;

  // Whats New / Updates
  WhatsNewModal: undefined;
  MultiRPcMigrationModal: undefined;

  // Deep Links
  DeepLinkModal: object | undefined;

  // Multichain
  MultichainAccountsIntroModal: undefined;
  MultichainAccountsLearnMoreBottomSheet: undefined;

  // Notices
  Pna25BottomSheet: undefined;

  // Account/Connection Sheets
  AccountSelector: AccountSelectorParams | undefined;
  AccountConnect: AccountConnectParams | undefined;
  AccountPermissions: object | undefined;
  AccountActions: { selectedAccount?: object } | undefined;
  ConnectionDetails: object | undefined;
  RevokeAllAccountPermissions:
    | {
        hostInfo?: { metadata: { origin: string } };
        onRevokeAll?: (() => Promise<void>) | false;
      }
    | undefined;
  PermittedNetworksInfoSheet: undefined;
  AddAccount: undefined;
  SelectSRP: undefined;

  // Network
  NetworkSelector: object | undefined;
  AddNetwork: undefined;

  // SDK
  SDKLoading: undefined;
  SDKManageConnections: undefined;
  SDKDisconnect: undefined;
  ReturnToDappToast: undefined;

  // Basic Functionality / Data
  BasicFunctionality: undefined;
  DataCollection: undefined;
  ExperienceEnhancer: undefined;
  ConfirmTurnOnBackupAndSync: object | undefined;
  ResetNotifications: undefined;

  // IPFS / NFT Display
  ShowIpfs: object | undefined;
  ShowNftDisplayMedia: undefined;
  ShowTokenId: object | undefined;

  // Tooltip / Success-Error
  tooltipModal: { title?: string; tooltip?: ReactNode } | undefined;
  SuccessErrorSheet: object | undefined;
  ChangeInSimulationModal: object | undefined;
  OriginSpamModal: object | undefined;

  // Seedphrase
  SeedphraseModal: undefined;

  // Eligibility / Regions
  EligibilityFailedModal: undefined;
  UnsupportedRegionModal: undefined;

  // Card
  CardNotification: undefined;
}

/**
 * Param list for the MultichainAccountDetailActions navigator.
 */
export interface MultichainAccountDetailActionsParamList {
  MultichainAccountActions: { selectedAccount?: object } | undefined;
  EditMultichainAccountName:
    | { accountId?: string; account?: object }
    | undefined;
  LegacyEditMultichainAccountName:
    | { accountId?: string; account?: object }
    | undefined;
  EditWalletName: { walletId?: string } | undefined;
  ShareAddress: { address?: string; account?: object } | undefined;
  ShareAddressQR: {
    address: string;
    networkName?: string;
    chainId?: string;
    groupId?: string;
  };
  DeleteAccount: { accountId?: string; account?: object } | undefined;
  RevealPrivateCredential: object | undefined;
  RevealSRPCredential: undefined;
  SRPRevealQuizInMultichainAccountDetails: undefined;
  SmartAccount: undefined;
  SmartAccountDetails: undefined;
}

/**
 * Param list for the RewardsBottomSheetModal navigator.
 */
export interface RewardsBottomSheetModalParamList {
  RewardsBottomSheetModal: undefined;
  RewardsClaimBottomSheetModal: undefined;
  RewardsIntroModal: undefined;
  RewardOptInAccountGroupModal: undefined;
  RewardsReferralBottomSheetModal: undefined;
  EndOfSeasonClaimBottomSheet: undefined;
}

/**
 * Param list for the WalletTabHome navigator.
 */
export interface WalletTabHomeParamList {
  WalletTabStackFlow:
    | {
        screen?: string;
        params?: object;
      }
    | undefined;
}

/**
 * Param list for WalletTabStackFlow navigator.
 */
export interface WalletTabStackFlowParamList {
  WalletView:
    | {
        shouldSelectPerpsTab?: boolean;
        initialTab?: string;
      }
    | undefined;
  Collectible: undefined;
  RevealPrivateCredentialView:
    | {
        credentialName?: string;
        cancel?: () => void;
      }
    | undefined;
}
