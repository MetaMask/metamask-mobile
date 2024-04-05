// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { UseAccounts } from '../../../hooks/useAccounts';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

/**
 * AccountPermissionsRevoke props.
 */
export interface AccountPermissionsRevokeProps extends UseAccounts {
  isLoading?: boolean;
  permittedAddresses: string[];
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  hostname: string;
  urlWithProtocol: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
  accountAvatarType: AvatarAccountType;
}
