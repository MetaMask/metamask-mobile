// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { USER_INTENT } from '../../../../constants/permissions';
import { Account } from '../../../hooks/useAccounts';
import { AccountConnectScreens } from '../AccountConnect.types';

/**
 * AccountConnectSingle props.
 */
export interface AccountConnectSingleProps {
  defaultSelectedAccount: Account | undefined;
  isLoading?: boolean;
  onUserAction: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: string[]) => void;
  urlWithProtocol: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
  connection?: ConnectionProps;
}
