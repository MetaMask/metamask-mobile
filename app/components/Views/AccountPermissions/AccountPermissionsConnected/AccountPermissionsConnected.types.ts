// External dependencies.
import { UseAccounts } from '../../../../components/UI/AccountSelectorList/hooks/useAccounts/useAccounts.types';
import { AccountPermissionsProps } from '../';
import { Account } from '../../../../components/UI/AccountSelectorList';
import { AccountPermissionsScreens } from '../AccountPermissions.types';

/**
 * AccountPermissionsConnected props.
 */
export interface AccountPermissionsConnectedProps
  extends AccountPermissionsProps,
    UseAccounts {
  isLoading?: boolean;
  selectedAddresses: string[];
  onSetSelectedAddresses: (addresses: string[]) => void;
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
}
