import type { ReactNode } from 'react';
import type { LayoutRectangle } from 'react-native';
import type { FundActionMenuParams } from '../../../components/UI/FundActionMenu/FundActionMenu.types';
import type { OptionsSheetParams } from '../../../components/UI/SelectOptionSheet/types';
import type { AccountSelectorParams } from '../../../components/Views/AccountSelector/AccountSelector.types';
import type { AccountConnectParams } from '../../../components/Views/AccountConnect/AccountConnect.types';
import type { CaipChainId } from '@metamask/utils';
import type { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import type { BodyWebView } from '../../../component-library/components/Modals/ModalMandatory/ModalMandatory.types';
import type { SuccessErrorSheetParams } from '../../Views/SuccessErrorSheet/interface';

import type { AccountPermissionsScreens } from '../../../components/Views/AccountPermissions/AccountPermissions.types';
import type { AddressSelectorParams } from '../../../components/Views/AddressSelector/AddressSelector.types';

/**
 * Param list for the RootModalFlow navigator.
 * This contains all modal screens accessible via navigate('RootModalFlow', { screen, params }).
 */
export interface RootModalFlowParamList {
  // Index signature to satisfy ParamListBase constraint
  [key: string]: object | undefined;

  // Wallet Actions
  WalletActions: undefined;
  TradeWalletActions: {
    onDismiss?: () => void;
    buttonLayout?: LayoutRectangle;
  };
  FundActionMenu: FundActionMenuParams | undefined;

  // Modals
  DeleteWalletModal: { isResetWallet?: boolean } | undefined;
  ModalConfirmation:
    | {
        title: string;
        description: string;
        onConfirm?: () => void;
        onCancel?: () => void;
        cancelLabel?: string;
        confirmLabel?: string;
        isDanger?: boolean;
      }
    | undefined;
  ModalMandatory:
    | {
        body: BodyWebView | { source: 'Node'; component: () => ReactNode };
        headerTitle: string;
        onAccept: () => void;
        footerHelpText?: string;
        buttonText: string;
        checkboxText: string;
        onRender?: () => void;
        isScrollToEndNeeded?: boolean;
        scrollEndBottomMargin?: number;
        containerTestId?: string;
        buttonTestId?: string;
      }
    | undefined;

  // Settings/Options
  OnboardingSheet:
    | {
        onPressCreate?: () => void;
        onPressImport?: () => void;
        onPressContinueWithGoogle?: (createWallet: boolean) => void;
        onPressContinueWithApple?: (createWallet: boolean) => void;
        createWallet?: boolean;
      }
    | undefined;
  AssetOptions: { asset?: object } | undefined;
  NftOptions: { collectible?: object } | undefined;
  OptionsSheet: OptionsSheetParams | undefined;
  AssetHideConfirmation:
    | {
        asset?: object;
        onConfirm?: () => void | Promise<void>;
      }
    | undefined;

  // Remember Me / Security
  TurnOffRememberMeModal: undefined;
  UpdateNeededModal: undefined;
  OTAUpdatesModal: undefined;

  // Quiz/Reveal
  SRPRevealQuiz: { page?: number; keyringId?: string } | undefined;

  // NFT/Token Detection
  NFTAutoDetectionModal: undefined;
  DetectedTokens: undefined;
  DetectedTokensConfirmation:
    | {
        isHidingAll?: boolean;
        onConfirm: () => void;
      }
    | undefined;

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
  AddressSelector: AddressSelectorParams | undefined;
  AccountConnect: AccountConnectParams | undefined;
  AccountPermissions: { initialScreen?: AccountPermissionsScreens } | undefined;
  AccountActions: { selectedAccount?: object } | undefined;
  ConnectionDetails: object | undefined;
  RevokeAllAccountPermissions:
    | {
        hostInfo?: { metadata: { origin: string } };
        onRevokeAll?: (() => Promise<void>) | false;
      }
    | undefined;
  PermittedNetworksInfoSheet: undefined;
  AddAccount:
    | {
        scope?: CaipChainId;
        clientType?: WalletClientType;
      }
    | undefined;
  SelectSRP: undefined;
  SkipAccountSecurityModal:
    | {
        onConfirm?: () => void;
        onCancel?: () => void;
      }
    | undefined;

  // Network
  NetworkSelector: object | undefined;
  NetworkManager: undefined;
  AddNetwork: undefined;
  TokenSort: undefined;
  AmbiguousAddress: object | undefined;
  FiatOnTestnetsFriction: undefined;
  ShowTokenId: object | undefined;

  // SDK
  SDKLoading: undefined;
  SDKFeedback: undefined;
  SDKManageConnections:
    | {
        channelId?: string;
        icon?: string;
        urlOrTitle?: string;
        version?: string;
        platform?: string;
        isV2?: boolean;
      }
    | undefined;
  SDKDisconnect:
    | {
        channelId?: string;
        accountsLength?: number;
        account?: string;
        accountName?: string;
        dapp?: string;
        isV2?: boolean;
      }
    | undefined;
  ReturnToDappToast: undefined;

  // Basic Functionality / Data
  BasicFunctionality: { caller?: string } | undefined;
  DataCollection: undefined;
  ExperienceEnhancer: undefined;
  ConfirmTurnOnBackupAndSync: object | undefined;
  ResetNotifications: undefined;

  // IPFS / NFT Display
  ShowIpfs: object | undefined;
  ShowNftDisplayMedia: undefined;

  // Tooltip / Success-Error
  tooltipModal: { title?: string; tooltip?: ReactNode } | undefined;
  SuccessErrorSheet: SuccessErrorSheetParams | undefined;
  ChangeInSimulationModal:
    | {
        onProceed: () => void;
        onReject: () => void;
      }
    | undefined;
  OriginSpamModal:
    | {
        origin: string;
      }
    | undefined;

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
