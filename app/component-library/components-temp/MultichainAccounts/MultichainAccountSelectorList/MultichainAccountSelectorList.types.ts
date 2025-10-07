import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { RefObject } from 'react';
import { FlashListProps, FlashListRef } from '@shopify/flash-list';
import { AccountWalletId } from '@metamask/account-api';

/**
 * Account section data structure
 */
export interface AccountSection {
  title: string;
  wallet: AccountWalletObject;
  data: AccountGroupObject[];
}

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
  /**
   * Optional boolean to show footer
   */
  showFooter?: boolean;
  /**
   * Optional boolean to set keyboard avoiding view enabled
   */
  setKeyboardAvoidingViewEnabled?: (enabled: boolean) => void;
  /**
   * Optional account sections to override the default account sections from selector
   * Should be in the same format as selectAccountGroupsByWallet returns
   */
  accountSections?: AccountSection[];
  /**
   * Optional chain ID that determines which account address and network avatar to display
   */
  chainId?: string;
  /**
   * Optional boolean to hide the account cell menu
   */
  hideAccountCellMenu?: boolean;
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
