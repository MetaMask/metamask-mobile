import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AvatarAccountType } from '../../../../components/Avatars/Avatar/variants/AvatarAccount';

export interface AccountListCellProps {
  accountGroup: AccountGroupObject;
  avatarAccountType: AvatarAccountType;
  isSelected: boolean;
  onSelectAccount: (accountGroup: AccountGroupObject) => void;
}
