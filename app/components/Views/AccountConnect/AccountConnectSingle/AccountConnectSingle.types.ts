// External dependencies.
import { AccountConnectProps } from '..';
import { Account } from '../../../UI/AccountSelectorList';
import { AccountConnectScreens } from '../AccountConnect.types';

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
