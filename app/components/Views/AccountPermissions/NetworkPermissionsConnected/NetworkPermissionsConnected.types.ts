// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AccountPermissionsScreens } from '../AccountPermissions.types';

/**
 * AccountPermissionsConnected props.
 */
export interface NetworkPermissionsConnectedProps {
  onSetPermissionsScreen: (screen: AccountPermissionsScreens) => void;
  onDismissSheet: () => void;
  hostname: string;
  favicon: ImageSourcePropType;
}
