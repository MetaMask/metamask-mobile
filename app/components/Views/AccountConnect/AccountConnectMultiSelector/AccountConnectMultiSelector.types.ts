/**
 * Enum to track states of the account connect multi selector screen.
 */
export enum AccountConnectMultiSelectorScreens {
  AccountMultiSelector = 'AccountMultiSelector',
  AddAccountActions = 'AddAccountActions',
}

// External dependencies.
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';
import { UseAccounts } from '../../../hooks/useAccounts';
<<<<<<< HEAD
import { WalletClientType } from '../../../../core/SnapKeyring/MultichainWalletSnapClient';
=======
>>>>>>> stable

/**
 * AccountConnectMultiSelector props.
 */
export interface AccountConnectMultiSelectorProps
  extends Omit<UseAccounts, 'evmAccounts'> {
<<<<<<< HEAD
  defaultSelectedAddresses: CaipAccountId[];
  onSubmit: (addresses: CaipAccountId[]) => void;
  onCreateAccount: (clientType?: WalletClientType, scope?: CaipChainId) => void;
=======
  defaultSelectedAddresses: string[];
  onSubmit: (addresses: string[]) => void;
>>>>>>> stable
  isLoading?: boolean;
  hostname: string;
  isAutoScrollEnabled?: boolean;
  onBack: () => void;
  connection?: ConnectionProps;
  screenTitle?: string;
  isRenderedAsBottomSheet?: boolean;
  showDisconnectAllButton?: boolean;
}
