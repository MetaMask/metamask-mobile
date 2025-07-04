// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { UseAccounts } from '../../../hooks/useAccounts';
import { AccountPermissionsScreens } from '../AccountPermissions.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { CaipAccountId } from '@metamask/utils';

/**
 * AccountPermissionsConnected props.
 */
export interface AccountPermissionsConnectedProps
  extends Omit<UseAccounts, 'evmAccounts'> {
  isLoading?: boolean;
  selectedAddresses: CaipAccountId[];
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
  hostname: string;
  urlWithProtocol: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
  accountAvatarType: AvatarAccountType;
}
