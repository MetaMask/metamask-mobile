// External dependencies.
import { UseAccounts } from '../../../../util/accounts/hooks/useAccounts';
import { AccountConnectScreens } from '../AccountConnect.types';

/**
 * AccountConnectSingleSelector props.
 */
export interface AccountConnectSingleSelectorProps extends UseAccounts {
  selectedAddresses: string[];
  isLoading?: boolean;
  onCreateAccount: () => void;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: string[]) => void;
  onDismissSheetWithCallback: (callback?: () => void) => void;
}
