// External dependencies.
import { AccountConnectProps } from '..';
import { AccountConnectScreens } from '../AccountConnect.types';
import { Account } from '../../../../util/accounts/hooks/useAccounts';

/**
 * AccountConnectSingle props.
 */
export interface AccountConnectSingleProps extends AccountConnectProps {
  defaultSelectedAccount: Account | undefined;
  onConnect: () => void;
  isLoading?: boolean;
  onDismissSheet: () => void;
  onSetScreen: (screen: AccountConnectScreens) => void;
  onSetSelectedAddresses: (addresses: string[]) => void;
}
