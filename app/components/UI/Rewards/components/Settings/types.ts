import {
  WalletWithAccountGroupsWithOptInStatus,
  AccountGroupWithOptInStatus,
} from '../../hooks/useRewardOptinSummary';

export interface RewardSettingsAccountGroupListFlatListItem {
  type: 'wallet' | 'accountGroup' | 'showMore';
  walletItem?: WalletWithAccountGroupsWithOptInStatus;
  accountGroup?: AccountGroupWithOptInStatus;
  allAddresses?: string[];
  walletId?: string;
  remainingCount?: number;
  isExpanded?: boolean;
}
