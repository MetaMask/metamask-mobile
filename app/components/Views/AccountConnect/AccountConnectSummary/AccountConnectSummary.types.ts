import { CaipAccountId } from '@metamask/utils';
import { EnsByAccountAddress } from '../../../hooks/useAccounts';

export interface AccountConnectSummaryProps {
  currentPageInformation: {
    currentEnsName: string;
    icon: string | { uri: string };
    url: string;
  };
  selectedAddresses: CaipAccountId[];
  onEditAccountsPermissions: () => void;
  ensByAccountAddress: EnsByAccountAddress;
  // TODO: Might not be needed. Will check with Eric
  isNonDappNetworkSwitch?: boolean;
  showActionButtons?: boolean;
  isNetworkSwitch?: boolean;
  accountAddresses?: string[];
}
