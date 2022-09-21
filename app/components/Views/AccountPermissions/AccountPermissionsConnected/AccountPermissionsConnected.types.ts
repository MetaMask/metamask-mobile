// External dependencies.
import { UseAccounts } from '../../../../util/accounts/hooks/useAccounts';
import { AccountPermissionsProps } from '../';
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
