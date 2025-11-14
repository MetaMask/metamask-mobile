import {
  WalletWithAccountGroupsWithOptInStatus,
  AccountGroupWithOptInStatus,
} from '../../hooks/useRewardOptinSummary';

export interface RewardSettingsAccountGroupListFlatListItem {
  type: 'wallet' | 'accountGroup';
  walletItem?: WalletWithAccountGroupsWithOptInStatus;
  accountGroup?: AccountGroupWithOptInStatus;
  allAddresses?: string[];
}
