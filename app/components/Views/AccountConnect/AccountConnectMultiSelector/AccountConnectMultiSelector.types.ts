// External dependencies.
import { UseAccounts } from '../../../../util/accounts/hooks/useAccounts';
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
