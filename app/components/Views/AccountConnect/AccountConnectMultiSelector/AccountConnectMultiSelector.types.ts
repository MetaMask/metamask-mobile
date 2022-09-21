// External dependencies.
import { UseAccounts } from '../../../UI/AccountSelectorList/hooks/useAccounts/useAccounts.types';
import { AccountConnectProps } from '..';

/**
 * AccountConnectMultiSelector props.
 */
export interface AccountConnectMultiSelectorProps
  extends AccountConnectProps,
    UseAccounts {
  selectedAddresses: string[];
  onSelectAddress: (addresses: string[]) => void;
  isLoading?: boolean;
  onDismissSheetWithCallback: (callback?: () => void) => void;
  onCreateAccount: () => void;
  onConnect: () => void;
}
