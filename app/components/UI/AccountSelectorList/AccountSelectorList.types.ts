// Third party dependencies.
import { KeyringTypes } from '@metamask/controllers';
import React from 'react';
import { FlatListProps } from 'react-native';

// External dependencies.
import { AvatarGroupToken } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.types';
import { UseAccounts } from './hooks/useAccounts/useAccounts.types';

export interface SelectedAccount {
  address: string;
  lastUsed?: number;
}

export type SelectedAccountByAddress = Record<string, SelectedAccount>;

/**
 * Asset information associated with the account, which includes both the fiat balance and owned tokens.
 */
export interface Assets {
  /**
   * Fiat balance in string format.
   */
  fiatBalance: string;
  /**
   * Tokens owned by this account.
   */
  tokens?: AvatarGroupToken[];
}

/**
 * Account information.
 */
export interface Account {
  /**
   * Account name.
   */
  name: string;
  /**
   * Account address.
   */
  address: string;
  /**
   * Asset information associated with the account, which includes both the fiat balance and owned tokens.
   */
  assets?: Assets;
  /**
   * Account type.
   */
  type: KeyringTypes;
  /**
   * Y offset of the item. Used for scrolling purposes.
   */
  yOffset: number;
  /**
   * Boolean that indicates if the account is selected.
   */
  isSelected: boolean;
  /**
   * Optional error that indicates if the account has enough funds. Non-empty string will render the account item non-selectable.
   */
  balanceError?: string;
}

/**
 * AccountSelectorList props.
 */
export interface AccountSelectorListProps
  extends Partial<FlatListProps<Account>>,
    UseAccounts {
  /**
   * Optional callback to trigger when account is selected.
   */
  onSelectAccount?: (address: string, isSelected: boolean) => void;
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
}
