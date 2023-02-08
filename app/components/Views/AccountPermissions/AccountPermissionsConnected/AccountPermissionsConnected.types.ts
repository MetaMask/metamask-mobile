// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { UseAccounts } from '../../../hooks/useAccounts';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { IconName } from '../../../../component-library/components/Icon';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/AvatarAccount';

/**
 * AccountPermissionsConnected props.
 */
export interface AccountPermissionsConnectedProps extends UseAccounts {
  isLoading?: boolean;
  selectedAddresses: string[];
  onSetSelectedAddresses: (addresses: string[]) => void;
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
  hostname: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
  accountAvatarType: AvatarAccountType;
}
