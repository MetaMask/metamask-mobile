// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { AccountConnectScreens } from '../AccountConnect.types';
import { Account } from '../../../hooks/useAccounts';
import { IconName } from '../../../../component-library/components/Icon';

/**
 * AccountConnectSingle props.
 */
export interface AccountConnectSingleProps {
  defaultSelectedAccount: Account | undefined;
  onConnect: () => void;
  isLoading?: boolean;
  onDismissSheet: () => void;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: string[]) => void;
  hostname: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
}
