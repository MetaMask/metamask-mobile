// External dependencies.
import { UseAccounts } from '../../../hooks/useAccounts';
import { USER_INTENT } from '../../../../constants/permissions';
import { AccountConnectScreens } from '../AccountConnect.types';
import { CaipAccountId } from '@metamask/utils';

/**
 * AccountConnectSingleSelector props.
 */
export interface AccountConnectSingleSelectorProps
  extends Omit<UseAccounts, 'evmAccounts'> {
  selectedAddresses: CaipAccountId[];
  isLoading?: boolean;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: CaipAccountId[]) => void;
  onUserAction: React.Dispatch<React.SetStateAction<USER_INTENT>>;
}
