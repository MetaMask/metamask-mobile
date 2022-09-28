// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconName } from 'app/component-library/components/Icon';
import { UseAccounts } from '../../../hooks/useAccounts';
import { AccountPermissionsScreens } from '../AccountPermissions.types';

/**
 * AccountPermissionsRevoke props.
 */
export interface AccountPermissionsRevokeProps extends UseAccounts {
  isLoading?: boolean;
  permittedAddresses: string[];
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
  hostname: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
}
