// External dependencies.
import { UseAccounts } from '../../../../components/UI/AccountSelectorList/hooks/useAccounts/useAccounts.types';
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
