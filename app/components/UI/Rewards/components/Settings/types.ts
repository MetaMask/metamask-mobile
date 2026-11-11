import {
  WalletWithAccountGroupsWithOptInStatus,
  AccountGroupWithOptInStatus,
} from '../../hooks/useRewardOptinSummary';

export interface RewardSettingsAccountGroupListFlatListItem {
  type: 'wallet' | 'accountGroup' | 'showMore' | 'optOut' | 'environmentToggle';
  walletItem?: WalletWithAccountGroupsWithOptInStatus;
  accountGroup?: AccountGroupWithOptInStatus;
  allAddresses?: string[];
  walletId?: string;
  remainingCount?: number;
  isExpanded?: boolean;
}
