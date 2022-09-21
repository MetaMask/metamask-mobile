/* eslint-disable import/prefer-default-export */

import {
  Account,
  AccountSelectorListProps,
} from '../../AccountSelectorList.types';

/**
 * Mapping of ENS names by account address.
 */
export type EnsByAccountAddress = Record<string, string>;

/**
 * Optional params that useAccount hook takes.
 */
export interface UseAccountsParams {
  /**
   * Optional callback that is used to check for a balance requirement. Non-empty string will render the account item non-selectable.
   * @param balance - The ticker balance of an account in wei and hex string format.
   */

  checkBalanceError?: (balance: string) => string;
  /**
   * Optional boolean that indicates if accounts are being processed in the background. Setting this to true will prevent any unnecessary updates while loading.
   * @default false
   */
  isLoading?: boolean;
}

/**
 * Return value for useAccounts hook.
 */
export interface UseAccounts {
  /**
   * List of account information.
   */
  accounts: Account[];
  /**
   * Mapping of ENS names by account address.
   */
  ensByAccountAddress: EnsByAccountAddress;
}
