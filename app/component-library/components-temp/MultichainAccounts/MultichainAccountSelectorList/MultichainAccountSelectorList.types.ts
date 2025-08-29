import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RefObject } from 'react';
import { FlashListProps, FlashListRef } from '@shopify/flash-list';
import { InternalAccount } from '@metamask/keyring-internal-api';

/**
 * Flattened item type for the account list
 */
export type FlattenedMultichainAccountListItem =
  | { type: 'cell'; data: AccountGroupObject; walletName: string }
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
  selectedAccountGroups: AccountGroupObject[];
  /**
   * Test ID for the component
   */
  testID?: string;
  /**
   * Reference to the FlashList component
   */
  listRef?: RefObject<FlashListRef<FlattenedMultichainAccountListItem>>;
  /**
   * Optional filter function to filter account groups based on their internal accounts
   * Returns true to include the account group, false to exclude it
   */
  filterAccountGroup?: (
    accountGroup: AccountGroupObject,
    internalAccounts: Record<string, InternalAccount>,
  ) => boolean;
}

/**
 * Wallet section data structure
 */
export interface WalletSection {
  title: string;
  data: AccountGroupObject[];
  walletName: string;
}
