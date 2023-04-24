// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { UseAccounts } from '../../../hooks/useAccounts';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { USER_INTENT } from '../../../../constants/permissions';

/**
 * AccountConnectMultiSelector props.
 */
export interface AccountConnectMultiSelectorProps extends UseAccounts {
  selectedAddresses: string[];
  onSelectAddress: (addresses: string[]) => void;
  isLoading?: boolean;
  onUserAction: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  urlWithProtocol: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
  isAutoScrollEnabled?: boolean;
}
