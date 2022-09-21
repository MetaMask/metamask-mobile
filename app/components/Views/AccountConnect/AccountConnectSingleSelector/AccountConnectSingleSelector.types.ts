import { UseAccounts } from '../../../UI/AccountSelectorList/hooks/useAccounts/useAccounts.types';
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
