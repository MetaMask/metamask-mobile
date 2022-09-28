// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External dependencies.
import { UseAccounts } from '../../../hooks/useAccounts';
import { IconName } from '../../../../component-library/components/Icon';

/**
 * AccountConnectMultiSelector props.
 */
export interface AccountConnectMultiSelectorProps extends UseAccounts {
  selectedAddresses: string[];
  onSelectAddress: (addresses: string[]) => void;
  isLoading?: boolean;
  onDismissSheetWithCallback: (callback?: () => void) => void;
  onCreateAccount: () => void;
  onConnect: () => void;
  hostname: string;
  favicon: ImageSourcePropType;
  secureIcon: IconName;
}
