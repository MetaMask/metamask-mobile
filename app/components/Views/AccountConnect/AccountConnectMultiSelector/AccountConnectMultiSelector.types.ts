// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

/**
 * Enum to track states of the account connect multi selector screen.
 */
export enum AccountConnectMultiSelectorScreens {
  AccountMultiSelector = 'AccountMultiSelector',
  AddAccountActions = 'AddAccountActions',
}

// External dependencies.
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';
import { UseAccounts } from '../../../hooks/useAccounts';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { USER_INTENT } from '../../../../constants/permissions';
import { CaipAccountId } from '@metamask/utils';

/**
 * AccountConnectMultiSelector props.
 */
export interface AccountConnectMultiSelectorProps
  extends Omit<UseAccounts, 'evmAccounts'> {
  defaultSelectedAddresses: string[];
  onSubmit: (addresses: string[]) => void;
  isLoading?: boolean;
  hostname: string;
  isAutoScrollEnabled?: boolean;
  onBack: () => void;
  connection?: ConnectionProps;
  screenTitle?: string;
  isRenderedAsBottomSheet?: boolean;
  showDisconnectAllButton?: boolean;
}
