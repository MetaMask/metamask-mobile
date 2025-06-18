import { CaipAccountId } from '@metamask/utils';
import { USER_INTENT } from '../../../constants/permissions';
import { Account, EnsByAccountAddress } from '../../hooks/useAccounts';
import { NetworkAvatarProps } from '../../Views/AccountConnect/AccountConnect.types';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { SolScope } from '@metamask/keyring-api';
export interface PermissionsSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  onEdit?: () => void;
  onEditNetworks?: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  onCreateAccount?: (clientType: WalletClientType, scope: SolScope) => void;
  onUserAction?: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  onAddNetwork?: () => void;
  showActionButtons?: boolean;
  isAlreadyConnected?: boolean;
  isRenderedAsBottomSheet?: boolean;
  isDisconnectAllShown?: boolean;
  isNetworkSwitch?: boolean;
  customNetworkInformation?: {
    chainName: string;
    chainId: string;
  };
  accounts: Account[];
  accountAddresses?: CaipAccountId[];
  networkAvatars?: NetworkAvatarProps[];
  isNonDappNetworkSwitch?: boolean;
  onChooseFromPermittedNetworks?: () => void;
  ensByAccountAddress?: EnsByAccountAddress;
  setTabIndex?: (tabIndex: number) => void;
  tabIndex?: number;
  showPermissionsOnly?: boolean;
  showAccountsOnly?: boolean;
  promptToCreateSolanaAccount?: boolean;
}
