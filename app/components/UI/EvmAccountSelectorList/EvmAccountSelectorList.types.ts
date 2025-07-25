// Third party dependencies.
import React from 'react';
import { FlashListProps } from '@shopify/flash-list';

// External dependencies
import { Account, UseAccounts } from '../../hooks/useAccounts';
import { AccountWalletObject } from '@metamask/account-tree-controller';

type FlattenedAccountListItem =
  | { type: 'header'; data: AccountSection; sectionIndex: number }
  | {
      type: 'account';
      data: Account;
      sectionIndex: number;
      accountIndex: number;
    }
  | { type: 'footer'; data: AccountSection; sectionIndex: number };

/**
 * EvmAccountSelectorList props.
 */
export interface EvmAccountSelectorListProps
  extends Partial<FlashListProps<FlattenedAccountListItem>>,
    Omit<UseAccounts, 'evmAccounts'> {
  /**
   * Optional callback to trigger when account is selected.
   */
  onSelectAccount?: (address: string, isSelected: boolean) => void;
  /**
   * Optional callback to trigger when imported account is removed.
   */
  onRemoveImportedAccount?: (params: {
    removedAddress: string;
    nextActiveAddress: string;
  }) => void;
  /**
   * Optional boolean that indicates if accounts are being processed in the background. The accounts will be unselectable as long as this is true.
   * @default false
   */
  isLoading?: boolean;
  /**
   * Optional list of selected addresses that will be used to show selected accounts.
   * Scenarios where this can be used includes temporarily showing one or more selected accounts.
   * This is required for multi select to work since the list does not track selected accounts by itself.
   */
  selectedAddresses?: string[];
  /**
   * Optional boolean that indicates if list should be used as multi select.
   */
  isMultiSelect?: boolean;
  /**
   * Optional boolean that indicates if list should be used as select without menu.
   */
  isSelectWithoutMenu?: boolean;
  /**
   * Optional boolean that indicates if list should auto scroll to selected address.
   */
  isAutoScrollEnabled?: boolean;
  /**
   * Optional render function to replace the right accessory of each account element.
   */
  renderRightAccessory?: (
    accountAddress: string,
    accountName: string,
  ) => React.ReactNode;
  /**
   * Optional boolean to disable selection of the account elements.
   */
  isSelectionDisabled?: boolean;
  /**
   * Optional boolean to enable removing accounts.
   */
  isRemoveAccountEnabled?: boolean;
  /**
   * Optional boolean to indicate if privacy mode is enabled.
   */
  privacyMode?: boolean;
}

export interface AccountSection {
  title: string;
  wallet?: AccountWalletObject;
  data: Account[];
}

export type { FlattenedAccountListItem };
