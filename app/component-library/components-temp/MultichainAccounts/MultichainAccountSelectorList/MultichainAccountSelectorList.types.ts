import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RefObject } from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { AccountGroupId } from '@metamask/account-api';

/**
 * Flattened item type for the account list
 */
export type FlattenedMultichainAccountListItem =
  | {
      type: 'account';
      data: AccountGroupObject;
      walletName: string;
      isSelected: boolean;
    }
  | { type: 'header'; data: { title: string; walletName: string } }
  | { type: 'footer'; data: { walletName: string } };

/**
 * Props for MultichainAccountSelectorList component
 */
export interface MultichainAccountSelectorListProps
  extends Partial<FlashListProps<FlattenedMultichainAccountListItem>> {
  /**
   * Callback when an account is selected
   */
  onSelectAccount?: (accountGroup: AccountGroupObject) => void;
  /**
   * Selected account group
   */
  selectedAccountGroupsIds?: AccountGroupId[];
  /**
   * Test ID for the component
   */
  testID?: string;
  /**
   * Reference to the FlashList component
   */
  listRef?: RefObject<FlashList<FlattenedMultichainAccountListItem>>;
}

/**
 * Wallet section data structure
 */
export interface WalletSection {
  title: string;
  data: AccountGroupObject[];
  walletName: string;
}
