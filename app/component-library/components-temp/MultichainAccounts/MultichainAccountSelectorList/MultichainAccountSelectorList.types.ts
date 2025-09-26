import { AccountGroupObject } from '@metamask/account-tree-controller';
import { RefObject } from 'react';
import { FlashListProps, FlashListRef } from '@shopify/flash-list';
import { AccountWalletId } from '@metamask/account-api';

/**
 * Flattened item type for the account list
 */
export type FlattenedMultichainAccountListItem =
  | { type: 'cell'; data: AccountGroupObject; walletName: string }
  | { type: 'header'; data: { title: string; walletName: string } }
  | { type: 'footer'; data: { walletName: string; walletId: AccountWalletId } };

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
   * Optional boolean to show checkbox
   */
  showCheckbox?: boolean;
}

/**
 * Wallet section data structure
 */
export interface WalletSection {
  title: string;
  data: AccountGroupObject[];
  walletName: string;
  walletId: AccountWalletId;
}
