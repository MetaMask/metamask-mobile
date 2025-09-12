import { AccountGroupObject } from '@metamask/account-tree-controller';

export interface AccountListCellProps {
  accountGroup: AccountGroupObject;
  isSelected: boolean;
  onSelectAccount: (accountGroup: AccountGroupObject) => void;
  showCheckbox?: boolean;
}
