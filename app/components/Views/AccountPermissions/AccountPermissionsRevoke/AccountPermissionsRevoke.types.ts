// External dependencies.
import { UseAccounts } from '../../../../util/accounts/hooks/useAccounts';
import {
  AccountPermissionsProps,
  AccountPermissionsScreens,
} from '../AccountPermissions.types';

/**
 * AccountPermissionsRevoke props.
 */
export interface AccountPermissionsRevokeProps
  extends AccountPermissionsProps,
    UseAccounts {
  isLoading?: boolean;
  permittedAddresses: string[];
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
}
