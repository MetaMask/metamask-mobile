// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AccountConnectScreens } from '../AccountConnect.types';
import { Account } from '../../../hooks/useAccounts';
import { IconName } from '../../../../component-library/components/Icon';
import USER_INTENT from '../../../../constants/permissions';

/**
 * AccountConnectSingle props.
 */
export interface AccountConnectSingleProps {
  defaultSelectedAccount: Account | undefined;
  isLoading?: boolean;
  onUserAction: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: string[]) => void;
  hostname: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
}
