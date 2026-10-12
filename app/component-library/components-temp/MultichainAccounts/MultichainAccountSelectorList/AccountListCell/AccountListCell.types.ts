import { AccountGroupObject } from '@metamask/account-tree-controller';
import type { AccountAvatarVariant } from '../../avatarAccountVariant';

export interface AccountListCellProps {
  accountGroup: AccountGroupObject;
  avatarAccountType: AccountAvatarVariant;
  isSelected: boolean;
  onSelectAccount: (accountGroup: AccountGroupObject) => void;
  showCheckbox?: boolean;
  chainId?: string;
  hideMenu?: boolean;
}
